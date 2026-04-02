/**
 * R2 Signed URL Generator
 *
 * Cloudflare R2 is S3-compatible, so we use the standard S3 presigning
 * mechanism for both uploads and downloads.
 *
 * Unlike AWS, which often uses CloudFront for CDN-layer signing,
 * R2 allows us to sign requests directly against the R2 endpoint
 * or a custom domain.
 *
 * This file handles generating time-limited GET URLs for reading assets.
 */

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { storageClient, STORAGE_BUCKET } from "./storage.client";

/** How long read URLs stay valid (seconds) */
const READ_URL_EXPIRY_SECONDS = 15 * 60; // 15 minutes

/**
 * Generate a time-limited signed URL for reading an asset from R2.
 *
 * @param assetKey — the S3 object key (e.g. "orgId/projectId/texture/uuid.png")
 * @returns A URL the browser can use to download the file
 */
export async function generateSignedReadUrl(assetKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: assetKey,
  });

  return getS3SignedUrl(storageClient, command, {
    expiresIn: READ_URL_EXPIRY_SECONDS,
  });
}
