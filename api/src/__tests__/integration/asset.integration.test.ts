import { vi, describe, it, beforeAll, afterAll, expect } from "vitest";

vi.mock("../../lib/storage/storage.presign", () => ({ generatePresignedUpload: vi.fn() }));
vi.mock("../../lib/storage/signed-urls", () => ({ generateSignedReadUrl: vi.fn() }));
vi.mock("../../lib/storage/storage.fetch", () => ({ fetchObjectAsText: vi.fn() }));
vi.mock("../../lib/storage/virus-scan.stub", () => ({ scheduleVirusScan: vi.fn() }));

import request from "supertest";
import { prisma } from "../../lib/db/client";
import { buildAssetTestApp } from "./helpers/asset-test-app";
import { seedOrg, teardownOrg, token, TestCtx } from "./helpers/seed";
import { getCsrf, CsrfCtx } from "./helpers/csrf";
import { generatePresignedUpload } from "../../lib/storage/storage.presign";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("Integration: POST /api/assets/presign", () => {
  const tag = Math.random().toString(36).slice(2, 8);
  const app = buildAssetTestApp();
  let ctx: TestCtx;
  let csrf: CsrfCtx;
  let projectId: string;

  beforeAll(async () => {
    ctx = await seedOrg(tag);
    csrf = await getCsrf(app);
    const project = await prisma.project.create({
      data: { orgId: ctx.org.id, name: `Asset-Test-Film-${tag}` },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await teardownOrg(ctx.org.id);
    vi.clearAllMocks();
  });

  const auth = (u: TestCtx["viewer"]) => `Bearer ${token(u)}`;
  const mutPost = (u: TestCtx["viewer"]) =>
    request(app)
      .post("/api/assets/presign")
      .set("Authorization", auth(u))
      .set("Cookie", csrf.cookie)
      .set("x-csrf-token", csrf.token);

  const base = { assetType: "model", fileName: "scene.glb", mimeType: "model/gltf-binary", fileSize: 1024 * 1024 };

  it("401 without token", async () => {
    const res = await request(app).post("/api/assets/presign")
      .set("Cookie", csrf.cookie).set("x-csrf-token", csrf.token)
      .send({ ...base, projectId });
    expect(res.status).toBe(401);
  });

  it("403 viewer cannot upload", async () => {
    const res = await mutPost(ctx.viewer).send({ ...base, projectId });
    expect(res.status).toBe(403);
  });

  it("400 for missing required fields", async () => {
    const res = await mutPost(ctx.editor).send({ assetType: "model" });
    expect(res.status).toBe(400);
  });

  it("400 for unsupported mimeType", async () => {
    const res = await mutPost(ctx.editor).send({ ...base, projectId, mimeType: "application/x-executable" });
    expect(res.status).toBe(400);
  });

  it("400 for invalid projectId (not a UUID)", async () => {
    const res = await mutPost(ctx.editor).send({ ...base, projectId: "not-a-uuid" });
    expect(res.status).toBe(400);
  });

  it("404 when project does not belong to org", async () => {
    const res = await mutPost(ctx.editor).send({ ...base, projectId: "00000000-0000-0000-0000-000000000000" });
    expect(res.status).toBe(404);
  });

  it("200 editor receives presigned upload URL", async () => {
    const mockKey = `${ctx.org.id}/${projectId}/model/uuid.glb`;
    vi.mocked(generatePresignedUpload).mockResolvedValueOnce({
      uploadUrl: "https://r2.example.com/put-url",
      assetKey: mockKey,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    const res = await mutPost(ctx.editor).send({ ...base, projectId });
    expect(res.status).toBe(200);
    expect(res.body.data.uploadUrl).toBe("https://r2.example.com/put-url");
    expect(res.body.data.assetKey).toBe(mockKey);
    expect(res.body.data.method).toBe("PUT");
    expect(res.body.data.expiresAt).toBeDefined();
  });

  it("200 admin can also upload", async () => {
    vi.mocked(generatePresignedUpload).mockResolvedValueOnce({
      uploadUrl: "https://r2.example.com/put-url-admin",
      assetKey: `${ctx.org.id}/${projectId}/texture/uuid.png`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    const res = await mutPost(ctx.admin).send({ ...base, projectId, assetType: "texture", fileName: "albedo.png", mimeType: "image/png" });
    expect(res.status).toBe(200);
    expect(res.body.data.uploadUrl).toBeDefined();
  });
});
