import { describe, it, beforeAll, afterAll, expect } from "vitest";
import request from "supertest";
import { prisma } from "../../lib/db/client";
import { buildTestApp } from "./helpers/app";
import { seedOrg, teardownOrg, token, mfaCode, TestCtx } from "./helpers/seed";
import { getCsrf, CsrfCtx } from "./helpers/csrf";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("Integration: RBAC role boundaries", () => {
  const tag = Math.random().toString(36).slice(2, 8);
  const app = buildTestApp();
  let ctx: TestCtx;
  let csrf: CsrfCtx;
  let projectId: string;
  let sequenceId: string;
  let shotId: string;

  beforeAll(async () => {
    ctx = await seedOrg(tag);
    csrf = await getCsrf(app);
    const proj = await prisma.project.create({
      data: { orgId: ctx.org.id, name: `rbac-proj-${tag}`, aspectRatio: "16:9" },
    });
    projectId = proj.id;
    const seq = await prisma.sequence.create({
      data: { projectId, name: `rbac-seq-${tag}`, orderIndex: 0 },
    });
    sequenceId = seq.id;
    const shot = await prisma.shot.create({
      data: { sequenceId, name: `rbac-shot-${tag}`, orderIndex: 0 },
    });
    shotId = shot.id;
  });

  afterAll(async () => { await teardownOrg(ctx.org.id); });

  const auth = (u: TestCtx["viewer"]) => `Bearer ${token(u)}`;
  const mfa = () => ({ "x-mfa-token": mfaCode() });
  const mut = (r: request.Test, u: TestCtx["viewer"], c: CsrfCtx) =>
    r.set("Authorization", auth(u)).set("Cookie", c.cookie).set("x-csrf-token", c.token);

  // ── editor+ boundary: viewer blocked ──────────────────────────────────────

  it("viewer → POST /api/projects → 403", async () => {
    const res = await mut(request(app).post("/api/projects"), ctx.viewer, csrf)
      .send({ name: "x", aspectRatio: "16:9" });
    expect(res.status).toBe(403);
  });

  it("viewer → PUT /api/projects/:id → 403", async () => {
    const res = await mut(request(app).put(`/api/projects/${projectId}`), ctx.viewer, csrf)
      .send({ name: "y" });
    expect(res.status).toBe(403);
  });

  it("viewer → POST /api/projects/:id/sequences → 403", async () => {
    const res = await mut(request(app).post(`/api/projects/${projectId}/sequences`), ctx.viewer, csrf)
      .send({ name: "s", orderIndex: 0 });
    expect(res.status).toBe(403);
  });

  it("viewer → PUT /api/sequences/:id → 403", async () => {
    const res = await mut(request(app).put(`/api/sequences/${sequenceId}`), ctx.viewer, csrf)
      .send({ name: "s" });
    expect(res.status).toBe(403);
  });

  it("viewer → POST /api/sequences/:id/shots → 403", async () => {
    const res = await mut(request(app).post(`/api/sequences/${sequenceId}/shots`), ctx.viewer, csrf)
      .send({ name: "sh", orderIndex: 0, sceneData: {} });
    expect(res.status).toBe(403);
  });

  it("viewer → PUT /api/shots/:id → 403", async () => {
    const res = await mut(request(app).put(`/api/shots/${shotId}`), ctx.viewer, csrf)
      .send({ name: "sh" });
    expect(res.status).toBe(403);
  });

  it("editor CAN POST /api/projects → 201", async () => {
    const res = await mut(request(app).post("/api/projects"), ctx.editor, csrf)
      .send({ name: `p-${tag}`, aspectRatio: "16:9" });
    expect(res.status).toBe(201);
  });

  // ── admin+ boundary: editor blocked ───────────────────────────────────────

  it("editor → DELETE /api/projects/:id → 403", async () => {
    const res = await mut(request(app).delete(`/api/projects/${projectId}`), ctx.editor, csrf).set(mfa());
    expect(res.status).toBe(403);
  });

  it("editor → DELETE /api/sequences/:id → 403", async () => {
    const res = await mut(request(app).delete(`/api/sequences/${sequenceId}`), ctx.editor, csrf).set(mfa());
    expect(res.status).toBe(403);
  });

  it("editor → DELETE /api/shots/:id → 403", async () => {
    const res = await mut(request(app).delete(`/api/shots/${shotId}`), ctx.editor, csrf).set(mfa());
    expect(res.status).toBe(403);
  });

  it("editor → PUT /api/organizations → 403", async () => {
    const res = await mut(request(app).put("/api/organizations"), ctx.editor, csrf)
      .set(mfa()).send({ name: "blocked" });
    expect(res.status).toBe(403);
  });

  it("editor → POST /api/users → 403", async () => {
    const res = await mut(request(app).post("/api/users"), ctx.editor, csrf)
      .set(mfa()).send({ email: `x-${tag}@test.io` });
    expect(res.status).toBe(403);
  });

  // ── MFA gate ──────────────────────────────────────────────────────────────

  it("admin WITHOUT MFA → DELETE /api/projects/:id → 403", async () => {
    const res = await mut(request(app).delete(`/api/projects/${projectId}`), ctx.admin, csrf);
    expect(res.status).toBe(403);
  });

  it("admin WITH MFA CAN DELETE project → 200", async () => {
    const p = await prisma.project.create({
      data: { orgId: ctx.org.id, name: `del-${tag}`, aspectRatio: "16:9" },
    });
    const res = await mut(request(app).delete(`/api/projects/${p.id}`), ctx.admin, csrf).set(mfa());
    expect(res.status).toBe(200);
  });

  it("owner WITH MFA CAN DELETE sequence → 200", async () => {
    const s = await prisma.sequence.create({
      data: { projectId, name: `del-seq-${tag}`, orderIndex: 99 },
    });
    const res = await mut(request(app).delete(`/api/sequences/${s.id}`), ctx.owner, csrf).set(mfa());
    expect(res.status).toBe(200);
  });
});
