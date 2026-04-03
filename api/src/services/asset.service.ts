import { prisma } from "../lib/db/client";
import { generatePresignedUpload } from "../lib/storage/storage.presign";
import { generateSignedReadUrl } from "../lib/storage/signed-urls";
import { fetchObjectAsText } from "../lib/storage/storage.fetch";
import { scheduleVirusScan } from "../lib/storage/virus-scan.stub";
import { sanitizeGltf } from "../lib/storage/gltf-sanitizer";
import { ApiError } from "../lib/utils/api-error";
import { PresignRequest } from "../schemas/asset.schema";
import { AssetType } from "../lib/storage/magic-bytes";

export interface UploadTokenResult {
  uploadUrl: string;
  assetKey: string;
  expiresAt: string;
}

export async function generateUploadToken(
  orgId: string,
  body: PresignRequest,
): Promise<UploadTokenResult> {
  const project = await prisma.project.findFirst({
    where: { id: body.projectId, orgId, deletedAt: null },
    select: { id: true },
  });

  if (!project) {
    throw ApiError.notFound("Project");
  }

  const ext = mimeToExt(body.mimeType);

  const result = await generatePresignedUpload({
    orgId,
    projectId: body.projectId,
    assetType: body.assetType as AssetType,
    mimeType: body.mimeType,
    ext,
  });

  scheduleVirusScan(result.assetKey);

  return result;
}

export interface ReadUrlResult {
  readUrl: string;
  expiresAt: string;
}

export async function getReadUrl(
  orgId: string,
  assetKey: string,
): Promise<ReadUrlResult> {
  if (!assetKey.startsWith(`${orgId}/`)) {
    throw ApiError.forbidden("Access denied: asset key does not belong to your organization");
  }

  const readUrl = await generateSignedReadUrl(assetKey);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  return { readUrl, expiresAt };
}

export async function getGltfContent(
  orgId: string,
  assetKey: string,
): Promise<Record<string, unknown>> {
  if (!assetKey.startsWith(`${orgId}/`)) {
    throw ApiError.forbidden("Access denied: asset key does not belong to your organization");
  }

  if (!assetKey.endsWith(".gltf")) {
    throw ApiError.badRequest("This endpoint only serves .gltf files — use /api/assets/url for other types");
  }

  const raw = await fetchObjectAsText(assetKey);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw ApiError.unprocessable("Asset is not valid JSON");
  }

  try {
    const { sanitized } = sanitizeGltf(parsed);
    return sanitized;
  } catch (err) {
    throw ApiError.unprocessable(err instanceof Error ? err.message : "Invalid GLTF content");
  }
}

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
