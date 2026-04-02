/**
 * CloudFront Signed URL Generator
 *
 * WHAT IS CLOUDFRONT?
 * ────────────────────
 * CloudFront is AWS's CDN (Content Delivery Network).
 * Instead of users downloading files directly from S3 (which can be slow),
 * CloudFront caches your files at servers around the world ("edge locations").
 * A user in Europe gets the file from a European server, not from your US bucket.
 *
 * WHY SIGNED URLS?
 * • Our S3 bucket is PRIVATE — nobody can read files from it directly
 * • CloudFront Signed URLs prove the request came through our API
 * • They expire after 15 minutes — even if copied/shared, they become useless
 *
 * FALLBACK BEHAVIOR:
 * • If CLOUDFRONT_DOMAIN is not set → falls back to AWS S3 GetObject presigned URL
 * • This lets you develop locally without setting up CloudFront at all
 * • In production: set CLOUDFRONT_DOMAIN + CLOUDFRONT_KEY_PAIR_ID + CLOUDFRONT_PRIVATE_KEY
 *
 * Required env vars (only needed if CloudFront is configured):
 *   CLOUDFRONT_DOMAIN       — e.g. "https://d1234abcd.cloudfront.net"
 *   CLOUDFRONT_KEY_PAIR_ID  — the ID of your CloudFront key pair (from AWS Console)
 *   CLOUDFRONT_PRIVATE_KEY  — the RSA private key content (PEM format)
 */

import { getSignedUrl as getCFSignedUrl } from "@aws-sdk/cloudfront-signer";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET } from "./s3.client";

/** How long read URLs stay valid (seconds) */
const READ_URL_EXPIRY_SECONDS = 15 * 60; // 15 minutes

/**
 * Is CloudFront configured in this environment?
 * We check all three required variables — if any is missing, we fall back to S3.
 */
function isCloudFrontConfigured(): boolean {
  return !!(
    process.env.CLOUDFRONT_DOMAIN &&
    process.env.CLOUDFRONT_KEY_PAIR_ID &&
    process.env.CLOUDFRONT_PRIVATE_KEY
  );
}

/**
 * Generate a time-limited signed URL for reading an asset.
 *
 * Uses CloudFront if configured (production), otherwise falls back to
 * a presigned S3 GET URL (development / local).
 *
 * @param assetKey — the S3 object key (e.g. "orgId/projectId/texture/uuid.png")
 * @returns A URL the browser can use to download the file
 */
export async function generateSignedReadUrl(assetKey: string): Promise<string> {
  if (isCloudFrontConfigured()) {
    return generateCloudFrontUrl(assetKey);
  }
  return generateS3PresignedGet(assetKey);
}

/** Generate a CloudFront signed URL (production) */
function generateCloudFrontUrl(assetKey: string): string {
  const url = `${process.env.CLOUDFRONT_DOMAIN}/${assetKey}`;
  const expiresAt = Math.floor(Date.now() / 1000) + READ_URL_EXPIRY_SECONDS;

  // getSignedUrl from cloudfront-signer uses RSA to sign the URL
  // Only requests with our signature are allowed through CloudFront
  return getCFSignedUrl({
    url,
    dateLessThan: new Date(expiresAt * 1000).toISOString(),
    keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID!,
    privateKey: process.env.CLOUDFRONT_PRIVATE_KEY!,
  });
}

/** Generate a presigned S3 GET URL (dev fallback — no CloudFront needed) */
async function generateS3PresignedGet(assetKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: assetKey,
  });
  return getS3SignedUrl(s3Client, command, {
    expiresIn: READ_URL_EXPIRY_SECONDS,
  });
}
