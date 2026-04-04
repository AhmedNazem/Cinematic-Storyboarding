import { Response, NextFunction } from "express";
import { verifySync } from "otplib";
import { prisma } from "../lib/db/client";
import { AuthenticatedRequest } from "../types";

/**
 * Step-up MFA middleware for admin-level routes.
 * Must run AFTER authenticate + authorize("admin").
 *
 * Expects the current TOTP code in the X-MFA-Token header.
 * The user must have mfaEnabled=true and a stored mfaSecret — admins
 * without MFA configured are blocked until they enroll.
 *
 * TOTP window: ±1 step (30s each side) to tolerate minor clock drift.
 */
export async function requireMfa(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.headers["x-mfa-token"] as string | undefined;

  if (!token) {
    res.status(403).json({
      success: false,
      message: "MFA token required for this action",
      code: "MFA_REQUIRED",
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { mfaEnabled: true, mfaSecret: true },
  });

  if (!user?.mfaEnabled || !user.mfaSecret) {
    res.status(403).json({
      success: false,
      message: "MFA must be configured before performing admin actions",
      code: "MFA_NOT_CONFIGURED",
    });
    return;
  }

  const result = verifySync({
    secret: user.mfaSecret,
    token,
    epochTolerance: 30, // allow ±30s clock drift
  });

  if (!result.valid) {
    res.status(403).json({
      success: false,
      message: "Invalid or expired MFA token",
      code: "MFA_INVALID",
    });
    return;
  }

  next();
}
