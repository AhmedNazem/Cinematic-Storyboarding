import rateLimit from "express-rate-limit";
import type { Socket } from "socket.io";
import type { AuthenticatedRequest } from "../types";

/**
 * Rate limiter for public/unauthenticated routes.
 * More restrictive — prevents abuse from unknown IPs.
 */
export const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later",
    code: "TOO_MANY_REQUESTS",
  },
});

/**
 * Rate limiter for authenticated routes.
 * Keyed by verified user ID — prevents one user from consuming another's quota
 * even when multiple users share an IP (e.g. NAT, proxies).
 */
export const authenticatedRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as AuthenticatedRequest).user?.id;
    return userId ?? req.ip ?? "unknown";
  },
  message: {
    success: false,
    message: "Too many requests, please try again later",
    code: "TOO_MANY_REQUESTS",
  },
});

interface SocketRateLimitOptions {
  limit: number;    // max incoming events per window
  windowMs: number; // window size in ms
}

/**
 * Attaches a per-socket sliding-window rate limiter.
 * Call inside the `connection` handler for each namespace.
 * Emits an error event and disconnects the socket on flood.
 */
export function applySocketRateLimit(
  socket: Socket,
  opts: SocketRateLimitOptions,
): void {
  let count = 0;
  let windowStart = Date.now();

  socket.use((_packet, next) => {
    const now = Date.now();
    if (now - windowStart > opts.windowMs) {
      count = 0;
      windowStart = now;
    }
    count++;
    if (count > opts.limit) {
      next(new Error("RATE_LIMITED"));
      return;
    }
    next();
  });
}
