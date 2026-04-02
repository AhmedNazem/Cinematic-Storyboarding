import type { Server } from "socket.io";
import { prisma } from "../lib/db/client";
import { logger } from "../lib/utils/logger";
import { applySocketRateLimit } from "../middleware/rate-limit";
import { authenticateSocket } from "./middleware/authenticate.socket";
import { withValidation } from "./middleware/validate.socket";
import {
  joinProjectRoomSchema,
  leaveProjectRoomSchema,
  shotUpdateSchema,
  type JoinProjectRoomPayload,
  type LeaveProjectRoomPayload,
  type ShotUpdatePayload,
} from "./schemas/studio.schemas";
import type { AuthenticatedSocket, SocketErrorPayload } from "./types";

const ROOM = (projectId: string): string => `project:${projectId}`;

async function onJoin(socket: AuthenticatedSocket, payload: JoinProjectRoomPayload): Promise<void> {
  const { projectId } = payload;
  const { orgId, id: userId } = socket.data.user;

  // Server-side membership check — orgId always from JWT, never client payload
  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId, deletedAt: null },
    select: { id: true },
  });

  if (!project) {
    const err: SocketErrorPayload = { code: "NOT_FOUND", message: "Project not found or access denied" };
    socket.emit("error", err);
    return;
  }

  await socket.join(ROOM(projectId));
  const roomSize = (await socket.nsp.in(ROOM(projectId)).fetchSockets()).length;
  socket.emit("studio:joined", { projectId, roomSize });
  logger.info("Socket joined studio room", { userId, projectId, roomSize });
}

function onLeave(socket: AuthenticatedSocket, payload: LeaveProjectRoomPayload): void {
  socket.leave(ROOM(payload.projectId));
  logger.info("Socket left studio room", { userId: socket.data.user.id, projectId: payload.projectId });
}

async function onShotUpdate(socket: AuthenticatedSocket, payload: ShotUpdatePayload): Promise<void> {
  const { shotId, projectId, sceneData, clientVersion } = payload;
  const { orgId, id: userId } = socket.data.user;

  // Org-scoped query — verify ownership before any write
  const shot = await prisma.shot.findFirst({
    where: { id: shotId, sequence: { project: { id: projectId, orgId, deletedAt: null } }, deletedAt: null },
    select: { id: true, updatedAt: true },
  });

  if (!shot) {
    const err: SocketErrorPayload = { code: "NOT_FOUND", message: "Shot not found or access denied" };
    socket.emit("error", err);
    return;
  }

  const serverVersion = shot.updatedAt.getTime();

  // Optimistic reconciliation: stale client → send authoritative state back to sender only
  if (clientVersion !== serverVersion) {
    const current = await prisma.shot.findUnique({ where: { id: shotId }, select: { sceneData: true, updatedAt: true } });
    socket.emit("shot:reconcile", {
      shotId,
      authoritative: (current?.sceneData ?? {}) as Record<string, unknown>,
      serverVersion: current?.updatedAt.getTime() ?? serverVersion,
    });
    return;
  }

  // Persist and broadcast to room (excluding sender)
  const updated = await prisma.shot.update({ where: { id: shotId }, data: { sceneData } });
  socket.to(ROOM(projectId)).emit("shot:updated", {
    shotId,
    sceneData,
    updatedBy: userId,
    serverVersion: updated.updatedAt.getTime(),
  });
}

export function registerStudioNamespace(io: Server): void {
  const namespace = io.of("/studio");
  namespace.use(authenticateSocket);

  namespace.on("connection", (socket) => {
    const authed = socket as AuthenticatedSocket;
    applySocketRateLimit(authed, { limit: 60, windowMs: 10_000 });
    logger.info("Socket connected", { namespace: "/studio", socketId: authed.id, userId: authed.data.user.id });

    authed.on("studio:join",  withValidation(joinProjectRoomSchema,  onJoin));
    authed.on("studio:leave", withValidation(leaveProjectRoomSchema, onLeave));
    authed.on("shot:update",  withValidation(shotUpdateSchema,       onShotUpdate));
    authed.on("disconnect", () => {
      logger.info("Socket disconnected", { namespace: "/studio", socketId: authed.id, userId: authed.data.user.id });
    });
  });
}
