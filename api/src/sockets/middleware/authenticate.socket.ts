import type { Socket } from "socket.io";
import { verifyToken } from "../../lib/auth/jwt";
import { prisma } from "../../lib/db/client";
import { logger } from "../../lib/utils/logger";

/**
 * Socket.IO namespace middleware — JWT gate.
 * Extracts token from socket.handshake.auth.token, verifies it,
 * and attaches user info to socket.data.user.
 *
 * If auth fails, next(Error) is called — Socket.IO rejects the connection
 * before the `connection` event fires. The socket never enters connected state.
 *
 * Per AXIOM: never trust client-sent IDs — always derive from verified JWT.
 */
export async function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  const token = socket.handshake.auth?.token;

  if (!token || typeof token !== "string") {
    logger.warn("Socket connection rejected — missing token", {
      socketId: socket.id,
      namespace: socket.nsp.name,
    });
    next(new Error("UNAUTHORIZED"));
    return;
  }

  try {
    const payload = verifyToken(token);

    // Verify user still exists in DB (valid token but deleted user)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, orgId: true, role: true },
    });

    if (!user) {
      logger.warn("Socket connection rejected — user not found", {
        socketId: socket.id,
        sub: payload.sub,
      });
      next(new Error("UNAUTHORIZED"));
      return;
    }

    socket.data.user = { id: user.id, orgId: user.orgId, role: user.role };
    next();
  } catch {
    logger.warn("Socket connection rejected — invalid token", {
      socketId: socket.id,
      namespace: socket.nsp.name,
    });
    next(new Error("UNAUTHORIZED"));
  }
}
