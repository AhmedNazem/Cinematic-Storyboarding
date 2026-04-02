/**
 * Magic Bytes — File Type Validation
 *
 * WHAT ARE MAGIC BYTES?
 * ──────────────────────
 * Every file format starts with a specific sequence of bytes that identifies
 * its true type — like a hidden fingerprint. These are called "magic bytes"
 * (or "file signatures").
 *
 * Example:
 *   PNG files always start with: 89 50 4E 47 (= \x89PNG)
 *   JPEG files always start with: FF D8 FF
 *
 * WHY NOT JUST CHECK THE FILE EXTENSION?
 * • A malicious user could rename "malware.exe" to "photo.png"
 * • Checking magic bytes verifies the ACTUAL content format
 *
 * HOW THIS WORKS IN OUR FLOW:
 * • The client declares a MIME type when requesting a presigned URL
 * • We validate the declared type against our ALLOWED_MIME_TYPES here
 * • NOTE: At presign time we only validate the declared type (allowlist check)
 *   because the file hasn't been uploaded yet. True magic-bytes validation
 *   would require reading the file after upload via an S3 trigger/Lambda.
 *   See: docs/s3-setup-guide.md → "Post-Upload Validation" section.
 */

/** Asset types supported by the platform */
export type AssetType = "model" | "texture" | "thumbnail" | "video" | "audio";

/** MIME types we accept. Anything else is rejected outright. */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "model/gltf-binary",   // .glb  — binary GLTF 3D model
  "model/gltf+json",     // .gltf — text-based GLTF 3D model
  "video/mp4",
  "audio/mpeg",
  "audio/wav",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Magic byte signatures for each allowed MIME type.
 * Each entry is an array of hex byte values to match at offset 0.
 * A file is valid if ANY signature for its MIME type matches.
 */
const SIGNATURES: Record<AllowedMimeType, number[][]> = {
  "image/jpeg":       [[0xff, 0xd8, 0xff]],          // JFIF / EXIF
  "image/png":        [[0x89, 0x50, 0x4e, 0x47]],    // \x89PNG
  "image/webp":       [[0x52, 0x49, 0x46, 0x46]],    // RIFF header (WebP)
  "model/gltf-binary":[[0x67, 0x6c, 0x54, 0x46]],    // glTF
  "model/gltf+json":  [[0x7b]],                       // { — JSON object
  "video/mp4":        [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp box
    [0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70],
  ],
  "audio/mpeg":       [[0xff, 0xfb], [0xff, 0xf3], [0x49, 0x44, 0x33]], // MP3 / ID3
  "audio/wav":        [[0x52, 0x49, 0x46, 0x46]],    // RIFF header (WAV)
};

/**
 * Validate that a Buffer's first bytes match the declared MIME type.
 * Returns true if valid, false if suspicious.
 *
 * @param buffer  - First 16 bytes of the file (minimum recommended)
 * @param mimeType - The MIME type the client declared
 */
export function validateMagicBytes(
  buffer: Buffer,
  mimeType: string,
): boolean {
  const allowed = ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType);
  if (!allowed) return false;

  const signatures = SIGNATURES[mimeType as AllowedMimeType];
  if (!signatures) return false;

  return signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte),
  );
}

/**
 * Check if a declared MIME type is on the allowed list.
 * Fast allowlist check (no buffer needed) — used at presign time.
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType);
}
