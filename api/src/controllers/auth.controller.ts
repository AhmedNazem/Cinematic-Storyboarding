import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { REFRESH_TOKEN_CONFIG } from "../lib/auth/constants";
import { AuthenticatedRequest } from "../types";

const IS_PROD = process.env.NODE_ENV === "production";

// ─── Cookie helpers ───────────────────────────────────────────────────────────

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_TOKEN_CONFIG.cookieName, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_CONFIG.expiryDays * 24 * 60 * 60 * 1000,
    path: "/api/auth",  // scoped — cookie only sent to auth endpoints
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_TOKEN_CONFIG.cookieName, { path: "/api/auth" });
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Create a new organization and its first owner account.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { accessToken, rawRefreshToken } = await authService.register(
    req.body,
    req.ip,
    req.headers["user-agent"],
  );

  setRefreshCookie(res, rawRefreshToken);
  res.status(201).json({ success: true, data: { accessToken } });
}

/**
 * POST /api/auth/login
 * Authenticate with email + password.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { accessToken, rawRefreshToken } = await authService.login(
    req.body,
    req.ip,
    req.headers["user-agent"],
  );

  setRefreshCookie(res, rawRefreshToken);
  res.json({ success: true, data: { accessToken } });
}

/**
 * POST /api/auth/refresh
 * Exchange a valid refresh token (from cookie) for a new access token.
 * The old refresh token is revoked and a new one is issued (rotation).
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const rawToken = req.cookies?.[REFRESH_TOKEN_CONFIG.cookieName] as string | undefined;

  if (!rawToken) {
    res.status(401).json({
      success: false,
      message: "No refresh token",
      code: "MISSING_REFRESH_TOKEN",
    });
    return;
  }

  const { accessToken, rawRefreshToken } = await authService.refresh(
    rawToken,
    req.ip,
    req.headers["user-agent"],
  );

  setRefreshCookie(res, rawRefreshToken);
  res.json({ success: true, data: { accessToken } });
}

/**
 * POST /api/auth/logout
 * Revoke the refresh token and clear the cookie.
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const rawToken = req.cookies?.[REFRESH_TOKEN_CONFIG.cookieName] as string | undefined;

  if (rawToken) {
    await authService.logout(rawToken);
  }

  clearRefreshCookie(res);
  res.json({ success: true, data: null, message: "Logged out" });
}

/**
 * GET /api/auth/me
 * Return the authenticated user's info. Effectively a token verify endpoint.
 */
export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  res.json({ success: true, data: req.user });
}

/**
 * GET /api/auth/profile
 * Return the authenticated user's full profile from the DB.
 */
export async function profile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const data = await authService.getProfile(req.user!.id);
  res.json({ success: true, data });
}

/**
 * POST /api/auth/set-password
 * For invited users who have no password yet — set their initial password.
 */
export async function setPassword(req: Request, res: Response): Promise<void> {
  await authService.setPassword(req.body);
  res.json({ success: true, data: null, message: "Password set — you can now log in" });
}

/**
 * POST /api/auth/forgot-password
 * Send a password reset email. Always returns 200 to prevent user enumeration.
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  await authService.forgotPassword(req.body);
  res.json({ success: true, data: null, message: "If that email exists, a reset link has been sent" });
}

/**
 * POST /api/auth/reset-password
 * Complete the password reset using the token from the email.
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  await authService.resetPassword(req.body);
  res.json({ success: true, data: null, message: "Password updated — you can now log in" });
}
