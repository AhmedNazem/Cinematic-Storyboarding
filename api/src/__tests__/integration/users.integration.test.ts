import { describe, it, beforeAll, afterAll, expect } from "vitest";
import request from "supertest";
import { buildTestApp } from "./helpers/app";
import { seedOrg, teardownOrg, token, mfaCode, TestCtx } from "./helpers/seed";
import { getCsrf, CsrfCtx } from "./helpers/csrf";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("Integration: Users CRUD", () => {
  const tag = Math.random().toString(36).slice(2, 8);
  const app = buildTestApp();
  let ctx: TestCtx;
  let csrf: CsrfCtx;

  beforeAll(async () => {
    ctx = await seedOrg(tag);
    csrf = await getCsrf(app);
  });

  afterAll(async () => { await teardownOrg(ctx.org.id); });

  const auth = (u: TestCtx["viewer"]) => `Bearer ${token(u)}`;
  const mfa = () => ({ "x-mfa-token": mfaCode() });
  const mut = (r: request.Test, u: TestCtx["viewer"], c: CsrfCtx) =>
    r.set("Authorization", auth(u)).set("Cookie", c.cookie).set("x-csrf-token", c.token);

  // ─── GET /api/users ─────────────────────────────────────────────────────────

  it("GET /api/users → 401 without token", async () => {
    expect((await request(app).get("/api/users")).status).toBe(401);
  });

  it("GET /api/users → 200 returns org users list", async () => {
    const res = await request(app).get("/api/users").set("Authorization", auth(ctx.viewer));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4); // owner+admin+editor+viewer
  });

  // ─── GET /api/users/:id ─────────────────────────────────────────────────────

  it("GET /api/users/:id → 200 for user in same org", async () => {
    const res = await request(app).get(`/api/users/${ctx.editor.id}`).set("Authorization", auth(ctx.viewer));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ctx.editor.id);
  });

  it("GET /api/users/:id → 404 for user in different org (tenant isolation)", async () => {
    const other = await seedOrg(`x${tag}`);
    const res = await request(app)
      .get(`/api/users/${other.viewer.id}`)
      .set("Authorization", auth(ctx.viewer));
    expect(res.status).toBe(404);
    await teardownOrg(other.org.id);
  });

  // ─── POST /api/users ─────────────────────────────────────────────────────────

  it("POST /api/users → 403 for editor (requires admin+)", async () => {
    const res = await mut(request(app).post("/api/users"), ctx.editor, csrf)
      .set(mfa()).send({ email: "new@test.io" });
    expect(res.status).toBe(403);
  });

  it("POST /api/users → 403 for admin without MFA", async () => {
    const res = await mut(request(app).post("/api/users"), ctx.admin, csrf)
      .send({ email: "new@test.io" });
    expect(res.status).toBe(403);
  });

  it("POST /api/users → 400 for invalid email", async () => {
    const res = await mut(request(app).post("/api/users"), ctx.admin, csrf)
      .set(mfa()).send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("POST /api/users → 201 as admin with MFA, creates viewer by default", async () => {
    const email = `new-${tag}@test.io`;
    const res = await mut(request(app).post("/api/users"), ctx.admin, csrf)
      .set(mfa()).send({ email });
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe(email);
    expect(res.body.data.role).toBe("viewer");
  });

  // ─── PUT /api/users/:id ──────────────────────────────────────────────────────

  it("PUT /api/users/:id → 400 when admin tries to change own role", async () => {
    const res = await mut(request(app).put(`/api/users/${ctx.admin.id}`), ctx.admin, csrf)
      .set(mfa()).send({ role: "viewer" });
    expect(res.status).toBe(400);
  });

  it("PUT /api/users/:id → 200 as admin changing editor's role", async () => {
    const res = await mut(request(app).put(`/api/users/${ctx.viewer.id}`), ctx.admin, csrf)
      .set(mfa()).send({ role: "editor" });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("editor");
  });

  // ─── DELETE /api/users/:id ───────────────────────────────────────────────────

  it("DELETE /api/users/:id → 400 when admin removes themselves", async () => {
    const res = await mut(request(app).delete(`/api/users/${ctx.admin.id}`), ctx.admin, csrf)
      .set(mfa());
    expect(res.status).toBe(400);
  });
});
