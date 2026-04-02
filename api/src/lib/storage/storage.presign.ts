/**
 * Presigned Upload URL Generator
 * 
 * Flow:
 *   Browser → POST /api/assets/presign → API generates presigned PUT URL
 *   Browser → PUT {presignedUrl} (direct to Storage)
 * 
 * WHY IS THIS PATTERN USED?
 * • The API server never handles raw file bytes — saves bandwidth & memory
 * • The URL expires in 15 minutes — even if leaked, it's useless after
 */

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { storageClient, STORAGE_BUCKET } from "./storage.client";
import { ALLOWED_MIME_TYPES, type AssetType } from "./magic-bytes";

const PRESIGN_EXPIRY_SECONDS = 15 * 60; // 15 minutes

export interface PresignUploadParams {
  orgId: string;
  projectId: string;
  assetType: AssetType;
  mimeType: string;
  ext: string;
}

export interface PresignUploadResult {
  uploadUrl: string;
  assetKey: string;
  expiresAt: string;
}

/**
 * Generate a presigned PUT URL for Cloudflare R2 (S3-compatible).
 * Returns the upload URL + the permanent assetKey to store in DB.
 * 
 * Asset key format: /{orgId}/{projectId}/{assetType}/{uuid}.{ext}
 */
export async function generatePresignedUpload(
  params: PresignUploadParams,
): Promise<PresignUploadResult> {
  const { orgId, projectId, assetType, mimeType, ext } = params;

  if (
    !ALLOWED_MIME_TYPES.includes(
      mimeType as (typeof ALLOWED_MIME_TYPES)[number],
    )
  ) {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }

  const uuid = uuidv4();
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const assetKey = `${orgId}/${projectId}/${assetType}/${uuid}.${safeExt}`;

  const command = new PutObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: assetKey,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(storageClient, command, {
    expiresIn: PRESIGN_EXPIRY_SECONDS,
  });

  const expiresAt = new Date(
    Date.now() + PRESIGN_EXPIRY_SECONDS * 1000,
  ).toISOString();

  return { uploadUrl, assetKey, expiresAt };
}
