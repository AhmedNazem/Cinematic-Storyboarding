import { describe, it, beforeAll, afterAll, expect } from "vitest";
import request from "supertest";
import { prisma } from "../../lib/db/client";
import { buildTestApp } from "./helpers/app";
import { seedOrg, teardownOrg, token, mfaCode, TestCtx } from "./helpers/seed";
import { getCsrf, CsrfCtx } from "./helpers/csrf";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("Integration: Soft-delete cascade", () => {
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

  // ── project → sequences → shots ───────────────────────────────────────────

  it("DELETE project sets deletedAt on project, all sequences, and all shots", async () => {
    const proj = await prisma.project.create({
      data: { orgId: ctx.org.id, name: `cascade-proj-${tag}`, aspectRatio: "16:9" },
    });
    const seq = await prisma.sequence.create({
      data: { projectId: proj.id, name: `cascade-seq-${tag}`, orderIndex: 0 },
    });
    const shot = await prisma.shot.create({
      data: { sequenceId: seq.id, name: `cascade-shot-${tag}`, orderIndex: 0 },
    });

    const res = await mut(request(app).delete(`/api/projects/${proj.id}`), ctx.admin, csrf).set(mfa());
    expect(res.status).toBe(200);

    const [dp, ds, dsh] = await Promise.all([
      prisma.project.findFirst({ where: { id: proj.id, deletedAt: { not: null } } }),
      prisma.sequence.findFirst({ where: { id: seq.id, deletedAt: { not: null } } }),
      prisma.shot.findFirst({ where: { id: shot.id, deletedAt: { not: null } } }),
    ]);
    expect(dp?.deletedAt).toBeTruthy();
    expect(ds?.deletedAt).toBeTruthy();
    expect(dsh?.deletedAt).toBeTruthy();
  });

  it("deleted project is invisible via GET /api/projects/:id → 404", async () => {
    const proj = await prisma.project.create({
      data: { orgId: ctx.org.id, name: `invisible-proj-${tag}`, aspectRatio: "16:9" },
    });
    await mut(request(app).delete(`/api/projects/${proj.id}`), ctx.admin, csrf).set(mfa());

    const res = await request(app)
      .get(`/api/projects/${proj.id}`)
      .set("Authorization", auth(ctx.viewer));
    expect(res.status).toBe(404);
  });

  it("deleted project excluded from GET /api/projects list", async () => {
    const countBefore = (
      await request(app).get("/api/projects").set("Authorization", auth(ctx.viewer))
    ).body.pagination.total;

    const proj = await prisma.project.create({
      data: { orgId: ctx.org.id, name: `listed-proj-${tag}`, aspectRatio: "16:9" },
    });
    const countAfter = (
      await request(app).get("/api/projects").set("Authorization", auth(ctx.viewer))
    ).body.pagination.total;
    expect(countAfter).toBe(countBefore + 1);

    await mut(request(app).delete(`/api/projects/${proj.id}`), ctx.admin, csrf).set(mfa());
    const countFinal = (
      await request(app).get("/api/projects").set("Authorization", auth(ctx.viewer))
    ).body.pagination.total;
    expect(countFinal).toBe(countBefore);
  });

  // ── sequence → shots ───────────────────────────────────────────────────────

  it("DELETE sequence sets deletedAt on sequence and all its shots", async () => {
    const proj = await prisma.project.create({
      data: { orgId: ctx.org.id, name: `seq-cascade-proj-${tag}`, aspectRatio: "16:9" },
    });
    const seq = await prisma.sequence.create({
      data: { projectId: proj.id, name: `seq-cascade-${tag}`, orderIndex: 0 },
    });
    const shot = await prisma.shot.create({
      data: { sequenceId: seq.id, name: `seq-cascade-shot-${tag}`, orderIndex: 0 },
    });

    const res = await mut(request(app).delete(`/api/sequences/${seq.id}`), ctx.admin, csrf).set(mfa());
    expect(res.status).toBe(200);

    const [ds, dsh] = await Promise.all([
      prisma.sequence.findFirst({ where: { id: seq.id, deletedAt: { not: null } } }),
      prisma.shot.findFirst({ where: { id: shot.id, deletedAt: { not: null } } }),
    ]);
    expect(ds?.deletedAt).toBeTruthy();
    expect(dsh?.deletedAt).toBeTruthy();
  });

  it("deleted sequence is invisible via GET /api/sequences/:id → 404", async () => {
    const proj = await prisma.project.create({
      data: { orgId: ctx.org.id, name: `seq-invisible-proj-${tag}`, aspectRatio: "16:9" },
    });
    const seq = await prisma.sequence.create({
      data: { projectId: proj.id, name: `seq-invisible-${tag}`, orderIndex: 0 },
    });
    await mut(request(app).delete(`/api/sequences/${seq.id}`), ctx.admin, csrf).set(mfa());

    const res = await request(app)
      .get(`/api/sequences/${seq.id}`)
      .set("Authorization", auth(ctx.viewer));
    expect(res.status).toBe(404);
  });
});
