import { describe, it, expect } from "vitest";
import { PresignRequestSchema, AssetReadSchema, AssetTypeSchema } from "../../schemas/asset.schema";

const VALID_PRESIGN = {
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  assetType: "model" as const,
  fileName: "hero_scene.glb",
  mimeType: "model/gltf-binary",
  fileSize: 1024 * 1024, // 1 MB
};

describe("AssetTypeSchema", () => {
  it("accepts all valid asset types", () => {
    for (const type of ["model", "texture", "thumbnail", "video", "audio"] as const) {
      expect(AssetTypeSchema.parse(type)).toBe(type);
    }
  });

  it("rejects unknown asset type", () => {
    expect(() => AssetTypeSchema.parse("script")).toThrow();
  });
});

describe("PresignRequestSchema", () => {
  // ─── Valid ──────────────────────────────────────────────────────────────────

  it("accepts a fully valid presign request", () => {
    const result = PresignRequestSchema.parse(VALID_PRESIGN);
    expect(result.projectId).toBe(VALID_PRESIGN.projectId);
    expect(result.assetType).toBe("model");
  });

  it("accepts all allowed MIME types", () => {
    const mimes = [
      "image/jpeg", "image/png", "image/webp",
      "model/gltf-binary", "model/gltf+json",
      "video/mp4", "audio/mpeg", "audio/wav",
    ];
    for (const mimeType of mimes) {
      expect(() => PresignRequestSchema.parse({ ...VALID_PRESIGN, mimeType })).not.toThrow();
    }
  });

  it("accepts fileSize at the 500 MB boundary", () => {
    expect(() => PresignRequestSchema.parse({ ...VALID_PRESIGN, fileSize: 500_000_000 })).not.toThrow();
  });

  // ─── Invalid ────────────────────────────────────────────────────────────────

  it("rejects non-UUID projectId", () => {
    expect(() => PresignRequestSchema.parse({ ...VALID_PRESIGN, projectId: "not-a-uuid" })).toThrow();
  });

  it("rejects unknown assetType", () => {
    expect(() => PresignRequestSchema.parse({ ...VALID_PRESIGN, assetType: "executable" })).toThrow();
  });

  it("rejects fileName with path traversal characters", () => {
    expect(() => PresignRequestSchema.parse({ ...VALID_PRESIGN, fileName: "../etc/passwd" })).toThrow();
  });

  it("rejects empty fileName", () => {
    expect(() => PresignRequestSchema.parse({ ...VALID_PRESIGN, fileName: "" })).toThrow();
  });

  it("rejects disallowed MIME type", () => {
    expect(() => PresignRequestSchema.parse({ ...VALID_PRESIGN, mimeType: "application/exe" })).toThrow();
  });

  it("rejects fileSize of 0", () => {
    expect(() => PresignRequestSchema.parse({ ...VALID_PRESIGN, fileSize: 0 })).toThrow();
  });

  it("rejects fileSize exceeding 500 MB", () => {
    expect(() => PresignRequestSchema.parse({ ...VALID_PRESIGN, fileSize: 500_000_001 })).toThrow();
  });

  it("rejects float fileSize (must be int)", () => {
    expect(() => PresignRequestSchema.parse({ ...VALID_PRESIGN, fileSize: 1024.5 })).toThrow();
  });
});

describe("AssetReadSchema", () => {
  it("accepts a valid asset key", () => {
    const result = AssetReadSchema.parse({ key: "org-1/proj-1/texture/uuid.png" });
    expect(result.key).toBe("org-1/proj-1/texture/uuid.png");
  });

  it("rejects empty key", () => {
    expect(() => AssetReadSchema.parse({ key: "" })).toThrow();
  });

  it("rejects missing key", () => {
    expect(() => AssetReadSchema.parse({})).toThrow();
  });
});
