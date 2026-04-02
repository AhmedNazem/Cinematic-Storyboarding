import type { Server } from "socket.io";
import { logger } from "../lib/utils/logger";
import { authenticateSocket } from "./middleware/authenticate.socket";
import { withValidation } from "./middleware/validate.socket";
import { presenceUpdateSchema, timelineSyncSchema } from "./schemas/collaboration.schemas";
import type {
  AuthenticatedSocket,
  PeerPresencePayload,
  PeerLeftPayload,
  TimelineProgressPayload,
} from "./types";
import type { PresenceUpdatePayload, TimelineSyncPayload } from "./schemas/collaboration.schemas";

const ROOM = (projectId: string): string => `project:${projectId}`;

function onPresence(socket: AuthenticatedSocket, payload: PresenceUpdatePayload): void {
  const { projectId, cursorPosition, selectedObjectId } = payload;
  const { id: userId } = socket.data.user;

  void socket.join(ROOM(projectId));

  const broadcast: PeerPresencePayload = { userId, cursorPosition, selectedObjectId };
  socket.to(ROOM(projectId)).emit("peer:presence", broadcast);
}

function onTimelineSync(socket: AuthenticatedSocket, payload: TimelineSyncPayload): void {
  const { projectId, progress, isPlaying } = payload;
  const { id: userId } = socket.data.user;

  const broadcast: TimelineProgressPayload = { userId, progress, isPlaying };
  socket.to(ROOM(projectId)).emit("timeline:progress", broadcast);
}

function onDisconnect(socket: AuthenticatedSocket): void {
  const { id: userId } = socket.data.user;
  const peerLeft: PeerLeftPayload = { userId };

  // Broadcast departure to all project rooms the socket was in
  for (const room of socket.rooms) {
    if (room.startsWith("project:")) {
      socket.to(room).emit("peer:left", peerLeft);
    }
  }

  logger.info("Socket disconnected", { namespace: "/collaboration", socketId: socket.id, userId });
}

export function registerCollaborationNamespace(io: Server): void {
  const namespace = io.of("/collaboration");
  namespace.use(authenticateSocket);

  namespace.on("connection", (socket) => {
    const authed = socket as AuthenticatedSocket;
    logger.info("Socket connected", { namespace: "/collaboration", socketId: authed.id, userId: authed.data.user.id });

    authed.on("collaboration:presence",      withValidation(presenceUpdateSchema, onPresence));
    authed.on("collaboration:timeline-sync", withValidation(timelineSyncSchema,  onTimelineSync));
    authed.on("disconnect", () => onDisconnect(authed));
  });
}
