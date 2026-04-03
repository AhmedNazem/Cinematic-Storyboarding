import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF protection via the double-submit cookie pattern.
 *
 * Flow:
 *  1. On any request without a csrf-token cookie, issue a new random token as
 *     a non-HttpOnly cookie (the SPA must read it via JS and echo it back).
 *  2. On state-mutating requests (POST/PUT/PATCH/DELETE), require the
 *     X-CSRF-Token header to match the cookie value.
 *  3. Routes that use Authorization: Bearer are already CSRF-safe (browsers
 *     cannot set custom headers cross-origin without CORS pre-flight), but we
 *     still enforce the pattern for defence-in-depth and future cookie auth.
 *
 * TRADEOFF: sameSite=strict on the cookie provides a first layer of defence;
 * the double-submit check is a second, explicit layer.
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  let cookieToken: string | undefined = req.cookies?.[CSRF_COOKIE];

  // Issue token on first visit
  if (!cookieToken) {
    cookieToken = crypto.randomBytes(32).toString("hex");
    res.cookie(CSRF_COOKIE, cookieToken, {
      httpOnly: false, // must be JS-readable for SPA to echo it back
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  // Auth endpoints use JSON bodies — browsers can't cross-origin POST JSON
  // without a CORS preflight, so they're inherently CSRF-safe.
  if (req.path.startsWith("/api/auth")) {
    next();
    return;
  }

  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!headerToken || headerToken !== cookieToken) {
    res.status(403).json({
      success: false,
      message: "CSRF token mismatch",
      code: "CSRF_VIOLATION",
    });
    return;
  }

  next();
}
