/**
 * Asset Upload Schema — Zod Validation
 *
 * This schema validates the request body for POST /api/assets/presign.
 * The client sends this before uploading a file — we validate it, then
 * return a presigned URL the client uses to upload directly to S3.
 *
 * All TypeScript types are inferred from Zod (single source of truth).
 */

import { z } from "zod";
import { ALLOWED_MIME_TYPES } from "../lib/storage/magic_bytes";

/** Asset type enum — mirrors AssetType in magic-bytes.ts */
export const AssetTypeSchema = z.enum([
  "model",      // 3D model (.glb, .gltf)
  "texture",    // Image texture (.png, .jpg, .webp)
  "thumbnail",  // Shot/sequence preview image
  "video",      // Animatic / reference footage
  "audio",      // Reference audio
]);

/**
 * Schema for POST /api/assets/presign
 * Client must tell us what kind of file they want to upload.
 */
export const PresignRequestSchema = z.object({
  /** Which project this asset belongs to */
  projectId: z.string().uuid({ message: "projectId must be a valid UUID" }),

  /** Asset category (determines S3 path prefix) */
  assetType: AssetTypeSchema,

  /**
   * Original file name — for display only, not stored in S3 key.
   * Only alphanumeric, dashes, dots, underscores, and spaces allowed.
   */
  fileName: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[\w\-. ]+$/, "fileName contains invalid characters"),

  /**
   * Declared MIME type of the file.
   * Must be one of our allowed types — validated against allowlist.
   */
  mimeType: z
    .string()
    .refine(
      (v) => ALLOWED_MIME_TYPES.includes(v as (typeof ALLOWED_MIME_TYPES)[number]),
      {
        message: `mimeType must be one of: ${ALLOWED_MIME_TYPES.join(", ")}`,
      },
    ),

  /**
   * File size in bytes.
   * Cap at 500 MB — S3 also enforces this via the presign ContentLength.
   */
  fileSize: z
    .number()
    .int()
    .positive()
    .max(500_000_000, "File size exceeds 500 MB limit"),
});

export type PresignRequest = z.infer<typeof PresignRequestSchema>;

/** Schema for GET /api/assets/url?key=... */
export const AssetReadSchema = z.object({
  key: z.string().min(1, "Asset key is required"),
});

export type AssetReadQuery = z.infer<typeof AssetReadSchema>;
