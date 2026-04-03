/** RBAC role hierarchy — higher index = more permissions */
export const ROLES = ["viewer", "editor", "admin", "owner"] as const;
export type Role = (typeof ROLES)[number];

/** Role hierarchy level lookup */
export const ROLE_LEVEL: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
};

/** JWT access token configuration */
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
  expiresIn: process.env.JWT_EXPIRES_IN || "15m",
} as const;

/** Refresh token configuration */
export const REFRESH_TOKEN_CONFIG = {
  /** Cookie name for the httpOnly refresh token */
  cookieName: "refresh_token",
  /** TTL in days */
  expiryDays: Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS ?? 7),
  /** bcrypt cost factor */
  bcryptRounds: 12,
} as const;
