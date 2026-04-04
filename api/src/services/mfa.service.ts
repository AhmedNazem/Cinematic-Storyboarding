import { generateSecret, generateURI, verifySync } from "otplib";
import qrcode from "qrcode";
import { prisma } from "../lib/db/client";
import { ApiError } from "../lib/utils/api-error";

const APP_NAME = process.env.APP_NAME ?? "Axiom";

/**
 * Generate a new TOTP secret, store it on the user (mfaEnabled stays false),
 * and return the otpauth URI plus a QR code data URL for the authenticator app.
 *
 * The secret is stored but MFA is NOT active until the user calls enableMfa()
 * with a valid TOTP code, proving they scanned it correctly.
 */
export async function setupMfa(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, mfaEnabled: true },
  });

  if (!user) throw ApiError.notFound("User");
  if (user.mfaEnabled) {
    throw new ApiError(409, "MFA is already enabled", "MFA_ALREADY_ENABLED");
  }

  const secret = generateSecret();
  const otpauthUri = generateURI({ issuer: APP_NAME, label: user.email, secret });
  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUri);

  // Persist the secret so enableMfa() can verify the code
  await prisma.user.update({
    where: { id: userId },
    data: { mfaSecret: secret },
  });

  return { secret, otpauthUri, qrCodeDataUrl };
}

/**
 * Verify the TOTP code against the stored secret and flip mfaEnabled=true.
 * The user must have called setupMfa() first.
 */
export async function enableMfa(userId: string, token: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true, mfaSecret: true },
  });

  if (!user) throw ApiError.notFound("User");
  if (user.mfaEnabled) {
    throw new ApiError(409, "MFA is already enabled", "MFA_ALREADY_ENABLED");
  }
  if (!user.mfaSecret) {
    throw new ApiError(400, "MFA setup not started — call /mfa/setup first", "MFA_SETUP_REQUIRED");
  }

  const result = verifySync({ token, secret: user.mfaSecret, epochTolerance: 30 });
  if (!result.valid) {
    throw new ApiError(400, "Invalid or expired TOTP code", "MFA_INVALID_TOKEN");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: true },
  });
}

/**
 * Disable MFA — requires a valid TOTP code as proof of possession.
 * Clears both mfaEnabled and mfaSecret.
 */
export async function disableMfa(userId: string, token: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true, mfaSecret: true },
  });

  if (!user) throw ApiError.notFound("User");
  if (!user.mfaEnabled || !user.mfaSecret) {
    throw new ApiError(400, "MFA is not enabled", "MFA_NOT_ENABLED");
  }

  const result = verifySync({ token, secret: user.mfaSecret, epochTolerance: 30 });
  if (!result.valid) {
    throw new ApiError(400, "Invalid or expired TOTP code", "MFA_INVALID_TOKEN");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: false, mfaSecret: null },
  });
}
