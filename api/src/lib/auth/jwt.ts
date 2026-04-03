import jwt from "jsonwebtoken";
import { JWT_CONFIG } from "./constants";

/** JWT payload shape */
export interface JwtPayload {
  sub: string; // User ID
  orgId: string;
  role: string;
  iat?: number;
  exp?: number;
}

/** Verify a JWT and return the decoded payload */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_CONFIG.secret) as JwtPayload;
}

/**
 * Generate a short-lived JWT access token.
 * Issued by POST /api/auth/login and POST /api/auth/refresh.
 */
export function generateToken(payload: {
  sub: string;
  orgId: string;
  role: string;
}): string {
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.expiresIn as jwt.SignOptions["expiresIn"],
  });
}
