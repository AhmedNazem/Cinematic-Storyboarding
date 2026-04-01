import rateLimit from "express-rate-limit";

/**
 * Rate limiter for public/unauthenticated routes.
 * More restrictive — prevents abuse from unknown IPs.
 */
export const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later",
    code: "TOO_MANY_REQUESTS",
  },
});

/**
 * Rate limiter for authenticated routes.
 * More permissive — legitimate users get higher limits.
 * <!-- TRADEOFF: keyed by IP for now; switch to user ID once auth is wired -->
 */
export const authenticatedRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later",
    code: "TOO_MANY_REQUESTS",
  },
});
