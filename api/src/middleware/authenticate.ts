import { Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth/jwt";
import { prisma } from "../lib/db/client";
import { AuthenticatedRequest } from "../types";

/**
 * JWT authentication middleware.
 * Extracts Bearer token from Authorization header, verifies it,
 * looks up the user in DB, and attaches to req.user.
 *
 * Per AXIOM: never trust client-sent user_id or org_id — derived from JWT.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Missing or invalid Authorization header",
      code: "UNAUTHORIZED",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyToken(token);

    // Verify user exists in DB (token could be valid but user deleted)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, orgId: true, role: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found",
        code: "UNAUTHORIZED",
      });
      return;
    }

    // Attach verified user info to request
    req.user = {
      id: user.id,
      orgId: user.orgId,
      role: user.role,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      code: "UNAUTHORIZED",
    });
  }
}
