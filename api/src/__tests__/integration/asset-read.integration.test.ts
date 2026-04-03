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
import { generateSignedReadUrl } from "../../lib/storage/signed-urls";
import { fetchObjectAsText } from "../../lib/storage/storage.fetch";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("Integration: GET /api/assets/url + /gltf", () => {
  const tag = Math.random().toString(36).slice(2, 8);
  const app = buildAssetTestApp();
  let ctx: TestCtx;
  let csrf: CsrfCtx;
  let projectId: string;

  beforeAll(async () => {
    ctx = await seedOrg(tag);
    csrf = await getCsrf(app);
    const project = await prisma.project.create({
      data: { orgId: ctx.org.id, name: `Asset-Read-Film-${tag}` },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await teardownOrg(ctx.org.id);
    vi.clearAllMocks();
  });

  const auth = (u: TestCtx["viewer"]) => `Bearer ${token(u)}`;
  const authGet = (path: string, u: TestCtx["viewer"]) =>
    request(app).get(path).set("Authorization", auth(u));

  describe("GET /api/assets/url", () => {
    const ownKey = () => `${ctx.org.id}/${projectId}/texture/thumb.png`;

    it("401 without token", async () => {
      const res = await request(app).get("/api/assets/url").query({ key: ownKey() });
      expect(res.status).toBe(401);
    });

    it("400 for missing key query param", async () => {
      expect((await authGet("/api/assets/url", ctx.viewer)).status).toBe(400);
    });

    it("403 when key belongs to a different org", async () => {
      const res = await authGet("/api/assets/url", ctx.viewer).query({ key: "other-org/p/t/f.png" });
      expect(res.status).toBe(403);
    });

    it("200 viewer receives signed read URL for own asset", async () => {
      vi.mocked(generateSignedReadUrl).mockResolvedValueOnce("https://cdn.r2.example.com/signed-read-url");
      const res = await authGet("/api/assets/url", ctx.viewer).query({ key: ownKey() });
      expect(res.status).toBe(200);
      expect(res.body.data.readUrl).toBe("https://cdn.r2.example.com/signed-read-url");
      expect(res.body.data.expiresAt).toBeDefined();
    });
  });

  describe("GET /api/assets/gltf", () => {
    const gltfKey = (orgId: string) => `${orgId}/${projectId}/model/scene.gltf`;

    it("401 without token", async () => {
      const res = await request(app).get("/api/assets/gltf").query({ key: gltfKey("any") });
      expect(res.status).toBe(401);
    });

    it("400 for missing key query param", async () => {
      expect((await authGet("/api/assets/gltf", ctx.viewer)).status).toBe(400);
    });

    it("403 when key belongs to a different org", async () => {
      const res = await authGet("/api/assets/gltf", ctx.viewer).query({ key: "other-org/p/model/scene.gltf" });
      expect(res.status).toBe(403);
    });

    it("400 when key is a .glb file (not .gltf)", async () => {
      const res = await authGet("/api/assets/gltf", ctx.viewer).query({ key: `${ctx.org.id}/${projectId}/model/scene.glb` });
      expect(res.status).toBe(400);
    });

    it("422 when R2 returns non-JSON content", async () => {
      vi.mocked(fetchObjectAsText).mockResolvedValueOnce("not-json{{{{");
      const res = await authGet("/api/assets/gltf", ctx.viewer).query({ key: gltfKey(ctx.org.id) });
      expect(res.status).toBe(422);
    });

    it("422 when content is valid JSON but missing required GLTF fields", async () => {
      vi.mocked(fetchObjectAsText).mockResolvedValueOnce(JSON.stringify({ foo: "bar" }));
      const res = await authGet("/api/assets/gltf", ctx.viewer).query({ key: gltfKey(ctx.org.id) });
      expect(res.status).toBe(422);
    });

    it("200 returns sanitized GLTF — extras stripped at all levels", async () => {
      vi.mocked(fetchObjectAsText).mockResolvedValueOnce(JSON.stringify({
        asset: { version: "2.0" },
        extras: { script: "alert('evil')" },
        nodes: [{ name: "Camera", extras: { internal: true } }, { name: "Light" }],
        unknownField: "should be stripped",
      }));
      const res = await authGet("/api/assets/gltf", ctx.viewer).query({ key: gltfKey(ctx.org.id) });
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/gltf/);
      expect(res.body.asset?.version).toBe("2.0");
      expect(res.body.extras).toBeUndefined();
      expect(res.body.unknownField).toBeUndefined();
      expect(res.body.nodes[0].name).toBe("Camera");
      expect(res.body.nodes[0].extras).toBeUndefined();
    });
  });
});
