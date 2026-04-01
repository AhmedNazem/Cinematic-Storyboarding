import express, { RequestHandler } from "express";

/**
 * Named payload size limits per route category.
 *
 * tiny  — user invites / role updates (just email + role string)
 * small — org / project / sequence mutations (name, settings, metadata)
 * scene — shot mutations (JSON scene graph: cameras, lights, object transforms)
 *
 * Global 10mb has been removed; every mutating route must declare its own limit.
 * Binary asset uploads go through S3 presign — they never hit these limits.
 */
export const BODY_LIMIT = {
  tiny:  "32kb",
  small: "64kb",
  scene: "512kb",
} as const;

/** Drop-in replacement for express.json() with an explicit size cap. */
export function jsonBody(limit: string): RequestHandler {
  return express.json({ limit });
}
