/**
 * Asset Routes — /api/assets
 *
 * All routes require authentication (JWT Bearer token).
 * The body-limit middleware caps request body size to prevent abuse.
 *
 * Routes:
 *   POST /api/assets/presign  — Request a presigned R2 upload URL
 *   GET  /api/assets/url      — Get a signed read URL for an existing asset
 *   GET  /api/assets/gltf     — Fetch, sanitize, and serve a .gltf file inline
 */

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { jsonBody, BODY_LIMIT } from "../middleware/body-limit";
import { PresignRequestSchema } from "../schemas/asset.schema";
import * as assetController from "../controllers/asset.controller";

const router = Router();

// All asset routes require a valid JWT
router.use(authenticate);

/**
 * POST /api/assets/presign
 * Request a presigned S3 PUT URL for uploading a file.
 *
 * Requires: role editor or above (viewers cannot upload assets)
 * Body: { projectId, assetType, fileName, mimeType, fileSize }
 * Returns: { uploadUrl, assetKey, expiresAt, method: "PUT" }
 */
router.post(
  "/presign",
  jsonBody(BODY_LIMIT.small),         // prevent oversized JSON bodies
  authorize("editor"),                // viewers cannot upload
  validate({ body: PresignRequestSchema }),
  assetController.presignUpload,
);

/**
 * GET /api/assets/url?key={assetKey}
 * Get a time-limited signed URL for reading/downloading an asset from R2.
 *
 * Any authenticated member of the org can read assets.
 * The service layer enforces that the key belongs to the requesting org.
 * Returns: { readUrl, expiresAt }
 */
router.get(
  "/url",
  assetController.getAssetUrl,
);

/**
 * GET /api/assets/gltf?key={assetKey}
 * Fetch a .gltf file from R2, sanitize it (strip "extras"), and serve inline.
 *
 * Strips any "extras" fields that may contain untrusted scripts before serving.
 * Only JSON-based .gltf files — binary .glb must use /url instead.
 * Returns: sanitized GLTF JSON (Content-Type: model/gltf+json)
 */
router.get(
  "/gltf",
  assetController.serveGltf,
);

export default router;
