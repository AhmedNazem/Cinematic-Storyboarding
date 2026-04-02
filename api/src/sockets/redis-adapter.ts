import type { Server } from "socket.io";
import { logger } from "../lib/utils/logger";

/**
 * Conditionally applies the Redis adapter for horizontal Socket.IO scaling.
 *
 * - If REDIS_URL is not set: logs a warning and continues in single-instance mode.
 * - If Redis is unreachable: logs an error and falls back to in-memory (non-fatal).
 *
 * Must be called BEFORE namespace registration — the adapter must be in place
 * before any rooms are created.
 *
 * Production note: multi-instance deployments require REDIS_URL to be set.
 * A readiness probe failure should signal missing Redis in production.
 */
export async function applyRedisAdapter(io: Server): Promise<void> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn("REDIS_URL not set — Socket.IO running in single-instance mode (no Redis adapter)");
    return;
  }

  try {
    const { Redis } = await import("ioredis");
    const { createAdapter } = await import("@socket.io/redis-adapter");

    const pub = new Redis(redisUrl, { lazyConnect: false });
    const sub = pub.duplicate();

    // Surface connection errors without crashing
    const onError = (err: Error): void => {
      logger.error("Redis adapter client error", { error: err.message });
    };
    pub.on("error", onError);
    sub.on("error", onError);

    io.adapter(createAdapter(pub, sub));

    logger.info("Redis adapter connected", {
      url: redisUrl.replace(/:[^:@]*@/, ":***@"), // mask password in logs
    });
  } catch (err) {
    logger.error("Redis adapter failed — falling back to in-memory adapter", {
      error: String(err),
    });
    // Intentional non-throw: server continues in single-instance mode
  }
}
