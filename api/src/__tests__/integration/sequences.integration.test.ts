import { describe, it, beforeAll, afterAll, expect } from "vitest";
import request from "supertest";
import { prisma } from "../../lib/db/client";
import { buildTestApp } from "./helpers/app";
import { seedOrg, teardownOrg, token, mfaCode, TestCtx } from "./helpers/seed";
import { getCsrf, CsrfCtx } from "./helpers/csrf";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("Integration: Sequences CRUD", () => {
  const tag = Math.random().toString(36).slice(2, 8);
  const app = buildTestApp();
  let ctx: TestCtx;
  let csrf: CsrfCtx;
  let projectId: string;
  let seqId: string;
  let deletableSeqId: string;

  beforeAll(async () => {
    ctx = await seedOrg(tag);
    csrf = await getCsrf(app);
    const project = await prisma.project.create({ data: { orgId: ctx.org.id, name: "Test Project" } });
    projectId = project.id;
    const [seq, del] = await Promise.all([
      prisma.sequence.create({ data: { projectId, name: "Act I", orderIndex: 0 } }),
      prisma.sequence.create({ data: { projectId, name: "To Delete", orderIndex: 1 } }),
    ]);
    seqId = seq.id;
    deletableSeqId = del.id;
  });

  afterAll(async () => { await teardownOrg(ctx.org.id); });

  const auth = (u: TestCtx["viewer"]) => `Bearer ${token(u)}`;
  const mut = (r: request.Test, u: TestCtx["viewer"], c: CsrfCtx) =>
    r.set("Authorization", auth(u)).set("Cookie", c.cookie).set("x-csrf-token", c.token);

  // ─── GET /api/projects/:id/sequences ────────────────────────────────────────

  it("GET sequences → 401 without token", async () => {
    const res = await request(app).get(`/api/projects/${projectId}/sequences`);
    expect(res.status).toBe(401);
  });

  it("GET sequences → 200 with viewer token, returns array", async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/sequences`)
      .set("Authorization", auth(ctx.viewer));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ─── GET /api/sequences/:id ─────────────────────────────────────────────────

  it("GET /api/sequences/:id → 200 for owned sequence", async () => {
    const res = await request(app).get(`/api/sequences/${seqId}`).set("Authorization", auth(ctx.viewer));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(seqId);
  });

  it("GET /api/sequences/:id → 404 for random UUID (tenant isolation)", async () => {
    const res = await request(app)
      .get("/api/sequences/00000000-0000-0000-0000-000000000000")
      .set("Authorization", auth(ctx.viewer));
    expect(res.status).toBe(404);
  });

  // ─── POST /api/projects/:id/sequences ───────────────────────────────────────

  it("POST sequences → 403 for viewer", async () => {
    const res = await mut(request(app).post(`/api/projects/${projectId}/sequences`), ctx.viewer, csrf)
      .send({ name: "Blocked" });
    expect(res.status).toBe(403);
  });

  it("POST sequences → 400 for invalid body", async () => {
    const res = await mut(request(app).post(`/api/projects/${projectId}/sequences`), ctx.editor, csrf)
      .send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("POST sequences → 201 as editor", async () => {
    const res = await mut(request(app).post(`/api/projects/${projectId}/sequences`), ctx.editor, csrf)
      .send({ name: "Act II", orderIndex: 2 });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Act II");
  });

  // ─── PUT /api/sequences/:id ─────────────────────────────────────────────────

  it("PUT /api/sequences/:id → 403 for viewer", async () => {
    const res = await mut(request(app).put(`/api/sequences/${seqId}`), ctx.viewer, csrf).send({ name: "X" });
    expect(res.status).toBe(403);
  });

  it("PUT /api/sequences/:id → 200 as editor", async () => {
    const res = await mut(request(app).put(`/api/sequences/${seqId}`), ctx.editor, csrf)
      .send({ name: "Prologue" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Prologue");
  });

  // ─── DELETE /api/sequences/:id ──────────────────────────────────────────────

  it("DELETE /api/sequences/:id → 403 without MFA", async () => {
    const res = await mut(request(app).delete(`/api/sequences/${deletableSeqId}`), ctx.admin, csrf);
    expect(res.status).toBe(403);
  });

  it("DELETE /api/sequences/:id → 200 as admin with MFA", async () => {
    const res = await mut(request(app).delete(`/api/sequences/${deletableSeqId}`), ctx.admin, csrf)
      .set("x-mfa-token", mfaCode());
    expect(res.status).toBe(200);
  });
});
