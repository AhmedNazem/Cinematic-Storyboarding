import type { Server } from "socket.io";
import { applyRedisAdapter } from "./redis-adapter";
import { registerStudioNamespace } from "./studio.namespace";
import { registerNotificationsNamespace } from "./notifications.namespace";
import { registerCollaborationNamespace } from "./collaboration.namespace";

/**
 * Mount all Socket.IO namespaces onto the server.
 * Must be called before httpServer.listen().
 *
 * Redis adapter is applied first — it must be in place before namespace
 * handlers register rooms, otherwise cross-instance room membership is lost.
 */
export async function mountNamespaces(io: Server): Promise<void> {
  await applyRedisAdapter(io);
  registerStudioNamespace(io);
  registerNotificationsNamespace(io);
  registerCollaborationNamespace(io);
}

// Re-export emitNotification for use from HTTP controllers
export { emitNotification } from "./notifications.namespace";
