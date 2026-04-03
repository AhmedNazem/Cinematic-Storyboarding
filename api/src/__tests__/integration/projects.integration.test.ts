import { describe, it, beforeAll, afterAll, expect } from "vitest";
import request from "supertest";
import { prisma } from "../../lib/db/client";
import { buildTestApp } from "./helpers/app";
import { seedOrg, teardownOrg, token, mfaCode, TestCtx } from "./helpers/seed";
import { getCsrf, CsrfCtx } from "./helpers/csrf";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("Integration: Projects CRUD", () => {
  const tag = Math.random().toString(36).slice(2, 8);
  const app = buildTestApp();
  let ctx: TestCtx;
  let otherCtx: TestCtx;
  let csrf: CsrfCtx;
  let projectId: string;
  let deletableId: string;

  beforeAll(async () => {
    [ctx, otherCtx] = await Promise.all([seedOrg(tag), seedOrg(`o${tag}`)]);
    csrf = await getCsrf(app);
    const [p, d] = await Promise.all([
      prisma.project.create({ data: { orgId: ctx.org.id, name: "Seed Film" } }),
      prisma.project.create({ data: { orgId: ctx.org.id, name: "To Delete" } }),
    ]);
    projectId = p.id;
    deletableId = d.id;
  });

  afterAll(async () => {
    await Promise.all([teardownOrg(ctx.org.id), teardownOrg(otherCtx.org.id)]);
  });

  const auth = (u: TestCtx["viewer"]) => `Bearer ${token(u)}`;
  const mut = (r: request.Test, u: TestCtx["viewer"], c: CsrfCtx) =>
    r.set("Authorization", auth(u)).set("Cookie", c.cookie).set("x-csrf-token", c.token);

  // ─── GET /api/projects ──────────────────────────────────────────────────────

  it("GET /api/projects → 401 without token", async () => {
    const res = await request(app).get("/api/projects");
    expect(res.status).toBe(401);
  });

  it("GET /api/projects → 200 with viewer token, pagination shape", async () => {
    const res = await request(app).get("/api/projects").set("Authorization", auth(ctx.viewer));
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 20 });
  });

  // ─── GET /api/projects/:id ──────────────────────────────────────────────────

  it("GET /api/projects/:id → 200 for own project", async () => {
    const res = await request(app).get(`/api/projects/${projectId}`).set("Authorization", auth(ctx.viewer));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(projectId);
  });

  it("GET /api/projects/:id → 404 for other org's project (tenant isolation)", async () => {
    const other = await prisma.project.create({ data: { orgId: otherCtx.org.id, name: "Other Film" } });
    const res = await request(app).get(`/api/projects/${other.id}`).set("Authorization", auth(ctx.viewer));
    expect(res.status).toBe(404);
  });

  // ─── POST /api/projects ─────────────────────────────────────────────────────

  it("POST /api/projects → 403 for viewer role", async () => {
    const res = await mut(request(app).post("/api/projects"), ctx.viewer, csrf).send({ name: "Blocked" });
    expect(res.status).toBe(403);
  });

  it("POST /api/projects → 400 for invalid body", async () => {
    const res = await mut(request(app).post("/api/projects"), ctx.editor, csrf).send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("POST /api/projects → 201 as editor", async () => {
    const res = await mut(request(app).post("/api/projects"), ctx.editor, csrf)
      .send({ name: "New Screenplay", aspectRatio: "16:9" });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("New Screenplay");
  });

  // ─── PUT /api/projects/:id ──────────────────────────────────────────────────

  it("PUT /api/projects/:id → 403 for viewer role", async () => {
    const res = await mut(request(app).put(`/api/projects/${projectId}`), ctx.viewer, csrf).send({ name: "X" });
    expect(res.status).toBe(403);
  });

  it("PUT /api/projects/:id → 200 as editor", async () => {
    const res = await mut(request(app).put(`/api/projects/${projectId}`), ctx.editor, csrf)
      .send({ name: "Updated Title" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Title");
  });

  // ─── DELETE /api/projects/:id ───────────────────────────────────────────────

  it("DELETE /api/projects/:id → 403 without MFA header", async () => {
    const res = await mut(request(app).delete(`/api/projects/${deletableId}`), ctx.admin, csrf);
    expect(res.status).toBe(403);
  });

  it("DELETE /api/projects/:id → 200 as admin with valid MFA", async () => {
    const res = await mut(request(app).delete(`/api/projects/${deletableId}`), ctx.admin, csrf)
      .set("x-mfa-token", mfaCode());
    expect(res.status).toBe(200);
  });
});
