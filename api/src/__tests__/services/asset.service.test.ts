import { vi, describe, it, expect, beforeEach } from "vitest";
import { generateUploadToken, getReadUrl, getGltfContent } from "../../services/asset.service";

// ─── Dependency mocks ─────────────────────────────────────────────────────────

vi.mock("../../lib/db/client", () => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../../lib/storage/storage.presign", () => ({
  generatePresignedUpload: vi.fn(),
}));

vi.mock("../../lib/storage/signed-urls", () => ({
  generateSignedReadUrl: vi.fn(),
}));

vi.mock("../../lib/storage/storage.fetch", () => ({
  fetchObjectAsText: vi.fn(),
}));

vi.mock("../../lib/storage/virus-scan.stub", () => ({
  scheduleVirusScan: vi.fn(),
}));

vi.mock("../../lib/storage/gltf-sanitizer", () => ({
  sanitizeGltf: vi.fn(),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { prisma } from "../../lib/db/client";
import { generatePresignedUpload } from "../../lib/storage/storage.presign";
import { generateSignedReadUrl } from "../../lib/storage/signed-urls";
import { fetchObjectAsText } from "../../lib/storage/storage.fetch";
import { scheduleVirusScan } from "../../lib/storage/virus-scan.stub";
import { sanitizeGltf } from "../../lib/storage/gltf-sanitizer";

const ORG = "org-1";
const PROJECT_ID = "proj-1";

describe("asset.service", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ─── generateUploadToken ──────────────────────────────────────────────────

  describe("generateUploadToken", () => {
    const validBody = {
      projectId: PROJECT_ID,
      assetType: "model" as const,
      fileName: "scene.glb",
      mimeType: "model/gltf-binary",
      fileSize: 1024 * 1024,
    };

    it("returns upload token when project belongs to org", async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue({ id: PROJECT_ID });
      vi.mocked(generatePresignedUpload).mockResolvedValue({
        uploadUrl: "https://r2.example.com/signed-put",
        assetKey: `${ORG}/${PROJECT_ID}/model/uuid.glb`,
        expiresAt: new Date().toISOString(),
      });

      const result = await generateUploadToken(ORG, validBody);

      expect(result.uploadUrl).toBeDefined();
      expect(result.assetKey).toContain(ORG);
      expect(scheduleVirusScan).toHaveBeenCalledWith(result.assetKey);
    });

    it("throws 404 when project not found or not in org", async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue(null);
      await expect(generateUploadToken(ORG, validBody)).rejects.toMatchObject({ statusCode: 404 });
      expect(generatePresignedUpload).not.toHaveBeenCalled();
    });
  });

  // ─── getReadUrl ───────────────────────────────────────────────────────────

  describe("getReadUrl", () => {
    it("returns signed read URL when asset key belongs to org", async () => {
      const assetKey = `${ORG}/${PROJECT_ID}/texture/uuid.png`;
      vi.mocked(generateSignedReadUrl).mockResolvedValue("https://cdn.example.com/signed-url");
      const result = await getReadUrl(ORG, assetKey);
      expect(result.readUrl).toBe("https://cdn.example.com/signed-url");
      expect(result.expiresAt).toBeDefined();
    });

    it("throws 403 when asset key belongs to different org", async () => {
      const foreignKey = `other-org/${PROJECT_ID}/texture/uuid.png`;
      await expect(getReadUrl(ORG, foreignKey)).rejects.toMatchObject({ statusCode: 403 });
      expect(generateSignedReadUrl).not.toHaveBeenCalled();
    });
  });

  // ─── getGltfContent ───────────────────────────────────────────────────────

  describe("getGltfContent", () => {
    const gltfKey = `${ORG}/${PROJECT_ID}/model/scene.gltf`;

    it("returns sanitized GLTF when key is valid", async () => {
      const raw = JSON.stringify({ asset: { version: "2.0" }, extras: { script: "evil" } });
      const clean = { asset: { version: "2.0" } };
      vi.mocked(fetchObjectAsText).mockResolvedValue(raw);
      vi.mocked(sanitizeGltf).mockReturnValue({ sanitized: clean, removed: ["extras"] });

      const result = await getGltfContent(ORG, gltfKey);
      expect(result).toEqual(clean);
      expect(sanitizeGltf).toHaveBeenCalled();
    });

    it("throws 403 when key belongs to different org", async () => {
      await expect(getGltfContent(ORG, "other-org/proj/model/x.gltf"))
        .rejects.toMatchObject({ statusCode: 403 });
    });

    it("throws 400 when key is not a .gltf file", async () => {
      await expect(getGltfContent(ORG, `${ORG}/${PROJECT_ID}/model/scene.glb`))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 422 when file content is not valid JSON", async () => {
      vi.mocked(fetchObjectAsText).mockResolvedValue("not-json{{");
      await expect(getGltfContent(ORG, gltfKey)).rejects.toMatchObject({ statusCode: 422 });
    });
  });
});
