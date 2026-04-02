import { S3Client } from "@aws-sdk/client-s3";

/**
 * Storage Client — Singleton
 * 
 * Configured for Cloudflare R2 (S3-compatible).
 */

const REQUIRED = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

for (const key of REQUIRED) {
  if (!process.env[key]) {
    throw new Error(
      `[Storage] Missing required env var: ${key}. ` +
        `See docs/CLOUDFLARE_R2_STORAGE.md for setup instructions.`,
    );
  }
}

/**
 * Shared storage client instance.
 * Import this wherever you need to call storage APIs (presign, delete, etc.)
 */
export const storageClient = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true, // Crucial for R2 compatibility with certain S3 SDK versions
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/** The R2 bucket name — all our assets live here */
export const STORAGE_BUCKET = process.env.R2_BUCKET_NAME!;
