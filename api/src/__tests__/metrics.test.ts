import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import {
  registry,
  httpRequestDuration,
  wsConnections,
  wsEvents,
  assetPresignDuration,
  renderRequestDuration,
  isMetricsAllowed,
} from "../lib/metrics";
import { metricsMiddleware } from "../middleware/metrics";

// ─── Reset registry state between tests ───
beforeEach(async () => {
  await registry.resetMetrics();
});

// ─── 1. Registry — all metrics are registered ───
describe("metrics registry", () => {
  it("registers api_request_duration_ms", () => {
    const names = registry.getMetricsAsArray().map((m) => m.name);
    expect(names).toContain("api_request_duration_ms");
  });

  it("registers websocket_connections", () => {
    const names = registry.getMetricsAsArray().map((m) => m.name);
    expect(names).toContain("websocket_connections");
  });

  it("registers websocket_events_total", () => {
    const names = registry.getMetricsAsArray().map((m) => m.name);
    expect(names).toContain("websocket_events_total");
  });

  it("registers asset_presign_duration_ms", () => {
    const names = registry.getMetricsAsArray().map((m) => m.name);
    expect(names).toContain("asset_presign_duration_ms");
  });

  it("registers render_request_duration_ms", () => {
    const names = registry.getMetricsAsArray().map((m) => m.name);
    expect(names).toContain("render_request_duration_ms");
  });
});

// ─── 2. metricsMiddleware — records histogram on response finish ───
describe("metricsMiddleware", () => {
  function buildApp(status = 200) {
    const app = express();
    app.use(metricsMiddleware);
    app.get("/test", (_req, res) => res.status(status).json({ ok: true }));
    return app;
  }

  it("adds an observation to api_request_duration_ms after a request", async () => {
    await request(buildApp()).get("/test");
    const json = await registry.getMetricsAsJSON();
    const hist = json.find((m) => m.name === "api_request_duration_ms");
    // At least one bucket/count entry should exist
    expect(hist?.values.length).toBeGreaterThan(0);
  });

  it("labels include method and status", async () => {
    await request(buildApp(201)).get("/test");
    const json = await registry.getMetricsAsJSON();
    const hist = json.find((m) => m.name === "api_request_duration_ms");
    const sample = hist?.values.find((v) => v.labels.status === "201");
    expect(sample).toBeDefined();
    expect(sample?.labels.method).toBe("GET");
  });

  it("records observations for different status codes separately", async () => {
    const app = express();
    app.use(metricsMiddleware);
    app.get("/ok",  (_req, res) => res.status(200).send("ok"));
    app.get("/err", (_req, res) => res.status(500).send("err"));

    await request(app).get("/ok");
    await request(app).get("/err");

    const json = await registry.getMetricsAsJSON();
    const hist = json.find((m) => m.name === "api_request_duration_ms");
    const statuses = new Set(hist?.values.map((v) => v.labels.status));
    expect(statuses.has("200")).toBe(true);
    expect(statuses.has("500")).toBe(true);
  });
});

// ─── 3. WebSocket gauges & counters (direct observation) ───
describe("websocket metrics", () => {
  it("wsConnections gauge increments and decrements", async () => {
    wsConnections.inc({ namespace: "/studio" });
    wsConnections.inc({ namespace: "/studio" });
    wsConnections.dec({ namespace: "/studio" });

    const json = await registry.getMetricsAsJSON();
    const gauge = json.find((m) => m.name === "websocket_connections");
    const val = gauge?.values.find((v) => v.labels.namespace === "/studio");
    expect(val?.value).toBe(1);
  });

  it("wsEvents counter increments per event", async () => {
    wsEvents.inc({ namespace: "/studio", event: "shot:update" });
    wsEvents.inc({ namespace: "/studio", event: "shot:update" });

    const json = await registry.getMetricsAsJSON();
    const counter = json.find((m) => m.name === "websocket_events_total");
    const val = counter?.values.find(
      (v) => v.labels.namespace === "/studio" && v.labels.event === "shot:update",
    );
    expect(val?.value).toBe(2);
  });
});

// ─── 4. isMetricsAllowed — /metrics IP guard ───
describe("isMetricsAllowed", () => {
  const ALLOWED = ["127.0.0.1", "::1", "::ffff:127.0.0.1", "10.0.0."];

  it("allows exact localhost IPv4", () => {
    expect(isMetricsAllowed("127.0.0.1", ALLOWED)).toBe(true);
  });

  it("allows IPv6 loopback", () => {
    expect(isMetricsAllowed("::1", ALLOWED)).toBe(true);
  });

  it("allows mapped IPv4 loopback", () => {
    expect(isMetricsAllowed("::ffff:127.0.0.1", ALLOWED)).toBe(true);
  });

  it("allows IP matching prefix (internal pod CIDR)", () => {
    expect(isMetricsAllowed("10.0.0.42", ALLOWED)).toBe(true);
  });

  it("denies external IP", () => {
    expect(isMetricsAllowed("203.0.113.1", ALLOWED)).toBe(false);
  });

  it("denies empty string", () => {
    expect(isMetricsAllowed("", ALLOWED)).toBe(false);
  });
});

// ─── 5. /metrics endpoint on a minimal Express app ───
describe("/metrics endpoint", () => {
  function buildMetricsApp(clientIp: string) {
    const app = express();
    // Simulate req.ip by overriding trust proxy so supertest IP is usable
    app.set("trust proxy", false);

    const ALLOWED = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];
    app.get("/metrics", async (req, res) => {
      const ip = clientIp; // injected for test isolation
      if (!isMetricsAllowed(ip, ALLOWED)) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }
      res.set("Content-Type", registry.contentType);
      res.end(await registry.metrics());
    });
    return app;
  }

  it("returns 200 with Prometheus text format for localhost", async () => {
    const res = await request(buildMetricsApp("127.0.0.1")).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/plain/);
    expect(res.text).toMatch(/api_request_duration_ms/);
  });

  it("returns 403 for non-local IP", async () => {
    const res = await request(buildMetricsApp("8.8.8.8")).get("/metrics");
    expect(res.status).toBe(403);
  });
});
