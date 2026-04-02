import type { Request, Response, NextFunction } from "express";
import { httpRequestDuration } from "../lib/metrics";

/**
 * Records api_request_duration_ms histogram on every response.
 * Route label uses req.route.path (Express pattern) to avoid cardinality explosion.
 * Falls back to the raw path if no route is matched (404s, health checks).
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const route = (req.route?.path as string | undefined) ?? req.path;
    httpRequestDuration.observe(
      { method: req.method, route, status: String(res.statusCode) },
      Date.now() - start,
    );
  });

  next();
}
