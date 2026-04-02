/**
 * GLTF Sanitizer
 *
 * WHAT IS GLTF?
 * ─────────────
 * GLTF (GL Transmission Format) is the standard 3D model format used by Three.js.
 * Files end in .gltf (JSON text) or .glb (binary).
 *
 * WHY SANITIZE IT?
 * The GLTF spec allows an "extras" field on most objects — it's a catch-all
 * JSON blob for custom data. Some tools embed JavaScript or executable scripts
 * in these fields. While Three.js doesn't execute them, we should strip them
 * before serving to follow defence-in-depth.
 *
 * This sanitizer is applied when serving .gltf files (read path),
 * NOT at upload time (we don't parse binary .glb server-side).
 */

/** Minimum required top-level GLTF fields per spec */
const REQUIRED_GLTF_FIELDS = ["asset"] as const;

/** Top-level GLTF fields we allow through (whitelist) */
const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "asset",
  "scene",
  "scenes",
  "nodes",
  "meshes",
  "materials",
  "textures",
  "images",
  "samplers",
  "accessors",
  "bufferViews",
  "buffers",
  "cameras",
  "animations",
  "skins",
  "extensions",
  "extensionsUsed",
  "extensionsRequired",
  // NOTE: "extras" is intentionally NOT in this list — we strip it
]);

export interface SanitizeResult {
  sanitized: Record<string, unknown>;
  /** Number of fields removed */
  removedCount: number;
}

/**
 * Sanitize a parsed GLTF JSON object.
 * - Validates it has required GLTF fields
 * - Strips any "extras" fields from the top level and all child nodes
 * - Removes any unknown top-level fields
 *
 * @throws Error if the input does not look like a valid GLTF document
 */
export function sanitizeGltf(raw: unknown): SanitizeResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("GLTF must be a JSON object");
  }

  const gltf = raw as Record<string, unknown>;

  // Validate required minimum fields exist
  for (const field of REQUIRED_GLTF_FIELDS) {
    if (!(field in gltf)) {
      throw new Error(`Invalid GLTF: missing required field "${field}"`);
    }
  }

  let removedCount = 0;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(gltf)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) {
      // Unknown or disallowed field (includes "extras")
      removedCount++;
      continue;
    }
    // Recursively strip "extras" from array items (nodes, meshes, etc.)
    sanitized[key] = stripExtrasDeep(value, removedCount);
  }

  return { sanitized, removedCount };
}

/**
 * Recursively remove "extras" from any nested object or array.
 * Returns the cleaned value.
 */
function stripExtrasDeep(value: unknown, _count: number): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripExtrasDeep(item, _count));
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "extras") continue; // strip
      cleaned[k] = stripExtrasDeep(v, _count);
    }
    return cleaned;
  }
  return value;
}
