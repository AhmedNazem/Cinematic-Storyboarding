import { describe, it, beforeAll, afterAll, expect } from "vitest";
import request from "supertest";
import { prisma } from "../../lib/db/client";
import { buildTestApp } from "./helpers/app";
import { seedOrg, teardownOrg, token, mfaCode, TestCtx } from "./helpers/seed";
import { getCsrf, CsrfCtx } from "./helpers/csrf";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("Integration: Shots CRUD", () => {
  const tag = Math.random().toString(36).slice(2, 8);
  const app = buildTestApp();
  let ctx: TestCtx;
  let csrf: CsrfCtx;
  let sequenceId: string;
  let shotId: string;
  let deletableShotId: string;

  beforeAll(async () => {
    ctx = await seedOrg(tag);
    csrf = await getCsrf(app);
    const project = await prisma.project.create({ data: { orgId: ctx.org.id, name: "Film" } });
    const seq = await prisma.sequence.create({ data: { projectId: project.id, name: "Act I", orderIndex: 0 } });
    sequenceId = seq.id;
    const [shot, del] = await Promise.all([
      prisma.shot.create({ data: { sequenceId, name: "Wide Shot", orderIndex: 0 } }),
      prisma.shot.create({ data: { sequenceId, name: "To Delete", orderIndex: 1 } }),
    ]);
    shotId = shot.id;
    deletableShotId = del.id;
  });

  afterAll(async () => { await teardownOrg(ctx.org.id); });

  const auth = (u: TestCtx["viewer"]) => `Bearer ${token(u)}`;
  const mut = (r: request.Test, u: TestCtx["viewer"], c: CsrfCtx) =>
    r.set("Authorization", auth(u)).set("Cookie", c.cookie).set("x-csrf-token", c.token);

  // ─── GET /api/sequences/:id/shots ───────────────────────────────────────────

  it("GET shots → 401 without token", async () => {
    const res = await request(app).get(`/api/sequences/${sequenceId}/shots`);
    expect(res.status).toBe(401);
  });

  it("GET shots → 200 with viewer, returns array", async () => {
    const res = await request(app)
      .get(`/api/sequences/${sequenceId}/shots`)
      .set("Authorization", auth(ctx.viewer));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ─── GET /api/shots/:id ─────────────────────────────────────────────────────

  it("GET /api/shots/:id → 200 for owned shot", async () => {
    const res = await request(app).get(`/api/shots/${shotId}`).set("Authorization", auth(ctx.viewer));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(shotId);
  });

  it("GET /api/shots/:id → 404 for unknown ID (tenant isolation)", async () => {
    const res = await request(app)
      .get("/api/shots/00000000-0000-0000-0000-000000000000")
      .set("Authorization", auth(ctx.viewer));
    expect(res.status).toBe(404);
  });

  // ─── POST /api/sequences/:id/shots ──────────────────────────────────────────

  it("POST shots → 403 for viewer", async () => {
    const res = await mut(request(app).post(`/api/sequences/${sequenceId}/shots`), ctx.viewer, csrf)
      .send({ name: "Blocked" });
    expect(res.status).toBe(403);
  });

  it("POST shots → 400 for invalid body (empty name)", async () => {
    const res = await mut(request(app).post(`/api/sequences/${sequenceId}/shots`), ctx.editor, csrf)
      .send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("POST shots → 201 as editor with valid body", async () => {
    const res = await mut(request(app).post(`/api/sequences/${sequenceId}/shots`), ctx.editor, csrf)
      .send({ name: "Close-Up", orderIndex: 2, durationSec: 3.5 });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Close-Up");
    expect(res.body.data.durationSec).toBe(3.5);
  });

  // ─── PUT /api/shots/:id ─────────────────────────────────────────────────────

  it("PUT /api/shots/:id → 403 for viewer", async () => {
    const res = await mut(request(app).put(`/api/shots/${shotId}`), ctx.viewer, csrf).send({ name: "X" });
    expect(res.status).toBe(403);
  });

  it("PUT /api/shots/:id → 200 as editor", async () => {
    const res = await mut(request(app).put(`/api/shots/${shotId}`), ctx.editor, csrf)
      .send({ name: "Crane Shot", durationSec: 8.0 });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Crane Shot");
  });

  // ─── DELETE /api/shots/:id ──────────────────────────────────────────────────

  it("DELETE /api/shots/:id → 403 without MFA", async () => {
    const res = await mut(request(app).delete(`/api/shots/${deletableShotId}`), ctx.admin, csrf);
    expect(res.status).toBe(403);
  });

  it("DELETE /api/shots/:id → 200 as admin with MFA", async () => {
    const res = await mut(request(app).delete(`/api/shots/${deletableShotId}`), ctx.admin, csrf)
      .set("x-mfa-token", mfaCode());
    expect(res.status).toBe(200);
  });
});
