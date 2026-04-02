/**
 * Asset Controller — Request / Response Handlers
 *
 * Thin layer: validate path/query params, call service, return response.
 * Business logic lives in asset.service.ts — not here.
 */

import { Response, NextFunction } from "express";
import { generateUploadToken, getReadUrl, getGltfContent } from "../services/asset.service";
import { AssetReadSchema, PresignRequest } from "../schemas/asset.schema";
import { AuthenticatedRequest } from "../types";
import { logger } from "../lib/utils/logger";

// ─── POST /api/assets/presign ─────────────────────────────────────────────────

/**
 * Generate a presigned S3 PUT URL for a file upload.
 *
 * The client uses this URL to upload directly to S3 — the API server
 * never touches the file bytes.
 *
 * Request body is already validated by the validate() middleware.
 * Returns: { uploadUrl, assetKey, expiresAt, method }
 */
export async function presignUpload(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // orgId always comes from the verified JWT — never from req.body
    const { orgId } = req.user!;
    const body = req.body as PresignRequest;

    const result = await generateUploadToken(orgId, body);
    logger.info("asset.presign", { orgId, assetKey: result.assetKey });

    res.status(200).json({
      success: true,
      data: {
        uploadUrl: result.uploadUrl,
        assetKey: result.assetKey,
        expiresAt: result.expiresAt,
        // Hint for the client: must use HTTP PUT (not POST) when uploading to S3
        method: "PUT",
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/assets/url?key=... ──────────────────────────────────────────────

/**
 * Return a signed read URL for an asset already stored in S3.
 *
 * The client provides the assetKey (stored in DB after upload).
 * We verify ownership then return a short-lived read URL.
 *
 * Returns: { readUrl, expiresAt }
 */
export async function getAssetUrl(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate query parameter
    const parseResult = AssetReadSchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: "Missing or invalid 'key' query parameter",
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const { orgId } = req.user!;
    const { key } = parseResult.data;

    const result = await getReadUrl(orgId, key);
    logger.debug("asset.getUrl", { orgId, key });

    res.status(200).json({
      success: true,
      data: {
        readUrl: result.readUrl,
        expiresAt: result.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/assets/gltf?key=... ────────────────────────────────────────────

/**
 * Fetch a .gltf file from R2, sanitize it (strip "extras"), and serve inline.
 *
 * Binary .glb files are NOT supported here — use /api/assets/url for those.
 * Returns the sanitized GLTF JSON with Content-Type: model/gltf+json.
 */
export async function serveGltf(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parseResult = AssetReadSchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: "Missing or invalid 'key' query parameter",
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const { orgId } = req.user!;
    const { key } = parseResult.data;

    const sanitized = await getGltfContent(orgId, key);
    logger.debug("asset.serveGltf", { orgId, key });

    res.status(200).type("model/gltf+json").json(sanitized);
  } catch (err) {
    next(err);
  }
}
