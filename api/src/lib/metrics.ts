import { Registry, Histogram, Gauge, Counter } from "prom-client";

/** Returns true if the given IP is in the allowed list. */
export function isMetricsAllowed(ip: string, allowed: string[]): boolean {
  return allowed.some((a) => ip === a || ip.startsWith(a));
}

export const registry = new Registry();

// ─── HTTP ───
export const httpRequestDuration = new Histogram({
  name: "api_request_duration_ms",
  help: "HTTP request duration in milliseconds",
  labelNames: ["method", "route", "status"],
  buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [registry],
});

// ─── WebSocket ───
export const wsConnections = new Gauge({
  name: "websocket_connections",
  help: "Current number of active WebSocket connections",
  labelNames: ["namespace"],
  registers: [registry],
});

export const wsEvents = new Counter({
  name: "websocket_events_total",
  help: "Total WebSocket events received",
  labelNames: ["namespace", "event"],
  registers: [registry],
});

// ─── Asset / Render (server-side timing) ───
export const assetPresignDuration = new Histogram({
  name: "asset_presign_duration_ms",
  help: "Time to generate a presigned upload URL in milliseconds",
  buckets: [5, 10, 25, 50, 100, 250],
  registers: [registry],
});

export const renderRequestDuration = new Histogram({
  name: "render_request_duration_ms",
  help: "Server-side headless render request duration in milliseconds",
  labelNames: ["shot_id"],
  buckets: [500, 1000, 2500, 5000, 10000, 30000],
  registers: [registry],
});
