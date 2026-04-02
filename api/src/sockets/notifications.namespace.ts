import type { Server } from "socket.io";
import { logger } from "../lib/utils/logger";
import { authenticateSocket } from "./middleware/authenticate.socket";
import { withValidation } from "./middleware/validate.socket";
import { subscribeNotificationsSchema } from "./schemas/notifications.schemas";
import type { AuthenticatedSocket, NotificationPayload } from "./types";
import { wsConnections, wsEvents } from "../lib/metrics";

const NS = "/notifications";

const ORG_ROOM = (orgId: string): string => `org:${orgId}:notifications`;

function onSubscribe(socket: AuthenticatedSocket, _payload: Record<string, never>): void {
  const { orgId, id: userId } = socket.data.user;
  void socket.join(ORG_ROOM(orgId));
  logger.info("Socket subscribed to notifications", { userId, orgId });
}

export function registerNotificationsNamespace(io: Server): void {
  const namespace = io.of("/notifications");
  namespace.use(authenticateSocket);

  namespace.on("connection", (socket) => {
    const authed = socket as AuthenticatedSocket;
    wsConnections.inc({ namespace: NS });
    logger.info("Socket connected", { namespace: NS, socketId: authed.id, userId: authed.data.user.id });

    authed.on("notifications:subscribe", withValidation(subscribeNotificationsSchema, (s, p) => { wsEvents.inc({ namespace: NS, event: "subscribe" }); return onSubscribe(s, p); }));
    authed.on("disconnect", () => {
      wsConnections.dec({ namespace: NS });
      logger.info("Socket disconnected", { namespace: NS, socketId: authed.id });
    });
  });
}

/**
 * Push a notification to all sockets in an org's notification room.
 * Called from HTTP route controllers after events (project.created, etc.).
 *
 * Example:
 *   emitNotification(io, orgId, { id, type: "project.created", message, resourceId, createdAt });
 */
export function emitNotification(io: Server, orgId: string, payload: NotificationPayload): void {
  io.of("/notifications").to(ORG_ROOM(orgId)).emit("notification:new", payload);
}
