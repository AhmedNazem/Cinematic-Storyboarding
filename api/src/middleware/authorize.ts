import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import { Role, ROLE_LEVEL } from "../lib/auth/constants";

/**
 * RBAC authorization middleware factory.
 * Checks that the authenticated user's role meets the minimum required level.
 * Must be used AFTER the authenticate middleware.
 *
 * Usage: authorize("editor") — allows editor, admin, owner
 *        authorize("admin")  — allows admin, owner only
 */
export function authorize(minimumRole: Role) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      });
      return;
    }

    const userLevel = ROLE_LEVEL[req.user.role as Role] ?? -1;
    const requiredLevel = ROLE_LEVEL[minimumRole];

    if (userLevel < requiredLevel) {
      res.status(403).json({
        success: false,
        message: `Requires ${minimumRole} role or higher`,
        code: "FORBIDDEN",
      });
      return;
    }

    next();
  };
}
