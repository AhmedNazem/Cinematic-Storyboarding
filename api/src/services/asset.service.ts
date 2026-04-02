import { prisma } from "../lib/db/client";
import { generatePresignedUpload } from "../lib/storage/storage.presign";
import { generateSignedReadUrl } from "../lib/storage/signed-urls";
import { fetchObjectAsText } from "../lib/storage/storage.fetch";
import { scheduleVirusScan } from "../lib/storage/virus-scan.stub";
import { sanitizeGltf } from "../lib/storage/gltf-sanitizer";
import { PresignRequest } from "../schemas/asset.schema";
import { AssetType } from "../lib/storage/magic-bytes";

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadTokenResult {
  uploadUrl: string;
  assetKey: string;
  expiresAt: string;
}

/**
 * Verify the user owns the project, then generate a presigned S3 upload URL.
 *
 * @param orgId     — from the verified JWT (never from client body)
 * @param body      — validated PresignRequest
 */
export async function generateUploadToken(
  orgId: string,
  body: PresignRequest,
): Promise<UploadTokenResult> {
  // Security: confirm the project belongs to this org before issuing any URL
  const project = await prisma.project.findFirst({
    where: { id: body.projectId, orgId, deletedAt: null },
    select: { id: true },
  });

  if (!project) {
    throw Object.assign(new Error("Project not found or access denied"), {
      statusCode: 404,
    });
  }

  // Derive file extension from the declared MIME type
  const ext = mimeToExt(body.mimeType);

  const result = await generatePresignedUpload({
    orgId,
    projectId: body.projectId,
    assetType: body.assetType as AssetType,
    mimeType: body.mimeType,
    ext,
  });

  // Fire-and-forget stub — replace with real scanner before production
  scheduleVirusScan(result.assetKey);

  return result;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export interface ReadUrlResult {
  readUrl: string;
  expiresAt: string;
}

/**
 * Verify the asset key belongs to this org, then return a signed read URL.
 *
 * Ownership check: the assetKey must start with "{orgId}/" — this prevents
 * Org A from generating read URLs for Org B's assets by guessing keys.
 *
 * @param orgId    — from the verified JWT
 * @param assetKey — the S3 key e.g. "orgId/projectId/texture/uuid.png"
 */
export async function getReadUrl(
  orgId: string,
  assetKey: string,
): Promise<ReadUrlResult> {
  // Cross-tenant enumeration guard
  if (!assetKey.startsWith(`${orgId}/`)) {
    throw Object.assign(
      new Error(
        "Access denied: asset key does not belong to your organization",
      ),
      { statusCode: 403 },
    );
  }

  const readUrl = await generateSignedReadUrl(assetKey);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  return { readUrl, expiresAt };
}

// ─── GLTF Sanitized Serve ─────────────────────────────────────────────────────

/**
 * Fetch a .gltf file from R2, sanitize it (strip "extras"), and return
 * the cleaned JSON. Only works for JSON-based .gltf files, not binary .glb.
 *
 * @param orgId    — from the verified JWT
 * @param assetKey — must be owned by the org and end in ".gltf"
 */
export async function getGltfContent(
  orgId: string,
  assetKey: string,
): Promise<Record<string, unknown>> {
  if (!assetKey.startsWith(`${orgId}/`)) {
    throw Object.assign(
      new Error("Access denied: asset key does not belong to your organization"),
      { statusCode: 403 },
    );
  }

  if (!assetKey.endsWith(".gltf")) {
    throw Object.assign(
      new Error("This endpoint only serves .gltf files — use /api/assets/url for other types"),
      { statusCode: 400 },
    );
  }

  const raw = await fetchObjectAsText(assetKey);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("Asset is not valid JSON"), { statusCode: 422 });
  }

  const { sanitized } = sanitizeGltf(parsed);
  return sanitized;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map MIME type to a safe file extension for the S3 key */
function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "model/gltf-binary": "glb",
    "model/gltf+json": "gltf",
    "video/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
  };
  return map[mime] ?? "bin";
}
