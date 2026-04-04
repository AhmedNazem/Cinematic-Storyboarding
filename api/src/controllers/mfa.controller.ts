import { Response } from "express";
import { AuthenticatedRequest } from "../types";
import * as mfaService from "../services/mfa.service";

/**
 * POST /api/auth/mfa/setup
 * Generate a TOTP secret + QR code. Does NOT enable MFA yet.
 */
export async function setup(req: AuthenticatedRequest, res: Response): Promise<void> {
  const data = await mfaService.setupMfa(req.user!.id);
  res.json({ success: true, data });
}

/**
 * POST /api/auth/mfa/enable
 * Verify the TOTP code and activate MFA on the account.
 */
export async function enable(req: AuthenticatedRequest, res: Response): Promise<void> {
  await mfaService.enableMfa(req.user!.id, req.body.token);
  res.json({ success: true, data: null, message: "MFA enabled" });
}

/**
 * DELETE /api/auth/mfa
 * Disable MFA — requires a valid TOTP code in the request body.
 */
export async function disable(req: AuthenticatedRequest, res: Response): Promise<void> {
  await mfaService.disableMfa(req.user!.id, req.body.token);
  res.json({ success: true, data: null, message: "MFA disabled" });
}
