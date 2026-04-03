import { describe, it, beforeAll, afterAll, expect } from "vitest";
import request from "supertest";
import { buildTestApp } from "./helpers/app";
import { seedOrg, teardownOrg, token, mfaCode, TestCtx } from "./helpers/seed";
import { getCsrf, CsrfCtx } from "./helpers/csrf";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("Integration: Organization CRUD", () => {
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
  const mut = (r: request.Test, u: TestCtx["viewer"], c: CsrfCtx) =>
    r.set("Authorization", auth(u)).set("Cookie", c.cookie).set("x-csrf-token", c.token);

  // ─── GET /api/organizations ─────────────────────────────────────────────────

  it("GET /api/organizations → 401 without token", async () => {
    const res = await request(app).get("/api/organizations");
    expect(res.status).toBe(401);
  });

  it("GET /api/organizations → 200 with viewer token, returns own org", async () => {
    const res = await request(app).get("/api/organizations").set("Authorization", auth(ctx.viewer));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ctx.org.id);
  });

  // ─── PUT /api/organizations ─────────────────────────────────────────────────

  it("PUT /api/organizations → 403 for viewer (requires admin+)", async () => {
    const res = await mut(request(app).put("/api/organizations"), ctx.viewer, csrf)
      .send({ name: "Blocked" });
    expect(res.status).toBe(403);
  });

  it("PUT /api/organizations → 403 for editor (requires admin+)", async () => {
    const res = await mut(request(app).put("/api/organizations"), ctx.editor, csrf)
      .send({ name: "Blocked" });
    expect(res.status).toBe(403);
  });

  it("PUT /api/organizations → 403 for admin without MFA", async () => {
    const res = await mut(request(app).put("/api/organizations"), ctx.admin, csrf)
      .send({ name: "No MFA" });
    expect(res.status).toBe(403);
  });

  it("PUT /api/organizations → 400 for invalid body (empty name)", async () => {
    const res = await mut(request(app).put("/api/organizations"), ctx.admin, csrf)
      .set("x-mfa-token", mfaCode())
      .send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("PUT /api/organizations → 200 as admin with MFA, updates name", async () => {
    const res = await mut(request(app).put("/api/organizations"), ctx.admin, csrf)
      .set("x-mfa-token", mfaCode())
      .send({ name: "AXIOM Productions" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("AXIOM Productions");
  });
});
