import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "../lib/db/client";
import { generateToken } from "../lib/auth/jwt";
import { REFRESH_TOKEN_CONFIG } from "../lib/auth/constants";
import { ApiError } from "../lib/utils/api-error";
import { sendPasswordResetEmail } from "../lib/email/email.service";
import type { RegisterInput, LoginInput, SetPasswordInput, ForgotPasswordInput, ResetPasswordInput } from "../schemas/auth.schema";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function refreshTokenExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_CONFIG.expiryDays);
  return d;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Register a new organization and its first owner account.
 * Returns access token + raw refresh token (caller sets the cookie).
 */
export async function register(
  input: RegisterInput,
  ip?: string,
  userAgent?: string,
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ApiError(409, "Email already in use", "EMAIL_TAKEN");

  const passwordHash = await bcrypt.hash(input.password, REFRESH_TOKEN_CONFIG.bcryptRounds);

  // Create org + owner in one transaction
  const user = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: input.orgName } });
    return tx.user.create({
      data: {
        orgId: org.id,
        email: input.email,
        passwordHash,
        role: "owner",
      },
      select: { id: true, orgId: true, role: true, email: true },
    });
  });

  return issueTokens(user, ip, userAgent);
}

/**
 * Login with email + password.
 * Returns access token + raw refresh token.
 */
export async function login(
  input: LoginInput,
  ip?: string,
  userAgent?: string,
) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, orgId: true, role: true, email: true, passwordHash: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }
  if (!user.passwordHash) {
    throw new ApiError(401, "Account has no password set — use set-password first", "NO_PASSWORD");
  }

  const match = await bcrypt.compare(input.password, user.passwordHash);
  if (!match) throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");

  return issueTokens(user, ip, userAgent);
}

/**
 * Rotate a refresh token — invalidate old, issue new access + refresh pair.
 * Implements refresh token rotation: each token can only be used once.
 */
export async function refresh(rawToken: string, ip?: string, userAgent?: string) {
  const tokenHash = hashToken(rawToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: { select: { id: true, orgId: true, role: true, email: true, deletedAt: true } },
    },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new ApiError(401, "Refresh token is invalid or expired", "INVALID_REFRESH_TOKEN");
  }
  if (stored.user.deletedAt) {
    throw new ApiError(401, "Account no longer exists", "INVALID_REFRESH_TOKEN");
  }

  // Revoke old token (rotation — one-time use)
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(stored.user, ip, userAgent);
}

/**
 * Revoke a refresh token (logout).
 */
export async function logout(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Set or reset password for an invited user (one who has no password yet).
 * Only works for accounts where passwordHash is null.
 */
export async function setPassword(input: SetPasswordInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, passwordHash: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }
  if (user.passwordHash) {
    throw new ApiError(409, "Password already set — use forgot-password flow instead", "PASSWORD_ALREADY_SET");
  }

  const passwordHash = await bcrypt.hash(input.password, REFRESH_TOKEN_CONFIG.bcryptRounds);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
}

/**
 * Fetch the authenticated user's full profile (no sensitive fields).
 */
export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      mfaEnabled: true,
      createdAt: true,
      updatedAt: true,
      organization: {
        select: { id: true, name: true },
      },
    },
  });

  if (!user) throw new ApiError(404, "User not found", "NOT_FOUND");
  return user;
}

/**
 * Initiate a password reset — generate a token, store its hash, send email.
 * Always returns success even if the email doesn't exist (prevents user enumeration).
 */
export async function forgotPassword(input: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, deletedAt: true },
  });

  // Silently succeed if user not found — don't leak whether email exists
  if (!user || user.deletedAt) return;

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);

  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  await sendPasswordResetEmail({ to: input.email, resetToken: rawToken });
}

/**
 * Complete a password reset — validate the token, set the new password, mark token used.
 */
export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = hashToken(input.token);

  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, deletedAt: true } } },
  });

  if (!stored || stored.usedAt || stored.expiresAt < new Date() || stored.user.deletedAt) {
    throw new ApiError(400, "Reset token is invalid or expired", "INVALID_RESET_TOKEN");
  }

  const passwordHash = await bcrypt.hash(input.password, REFRESH_TOKEN_CONFIG.bcryptRounds);

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: stored.user.id },
      data: { passwordHash },
    }),
  ]);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function issueTokens(
  user: { id: string; orgId: string; role: string },
  ip?: string,
  userAgent?: string,
) {
  const accessToken = generateToken({ sub: user.id, orgId: user.orgId, role: user.role });

  // Generate raw refresh token, store the hash
  const rawRefreshToken = crypto.randomBytes(64).toString("hex");
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(rawRefreshToken),
      userId: user.id,
      expiresAt: refreshTokenExpiry(),
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  });

  return { accessToken, rawRefreshToken };
}
