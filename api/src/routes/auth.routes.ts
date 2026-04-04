import { Router } from "express";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { jsonBody, BODY_LIMIT } from "../middleware/body-limit";
import { registerSchema, loginSchema, setPasswordSchema, mfaTokenSchema, forgotPasswordSchema, resetPasswordSchema } from "../schemas/auth.schema";
import * as authController from "../controllers/auth.controller";
import * as mfaController from "../controllers/mfa.controller";

const router = Router();

// POST /api/auth/register — create org + owner account
router.post(
  "/register",
  jsonBody(BODY_LIMIT.tiny),
  validate({ body: registerSchema }),
  authController.register,
);

// POST /api/auth/login — email + password → access token + refresh cookie
router.post(
  "/login",
  jsonBody(BODY_LIMIT.tiny),
  validate({ body: loginSchema }),
  authController.login,
);

// POST /api/auth/refresh — rotate refresh token, get new access token
router.post("/refresh", authController.refresh);

// POST /api/auth/logout — revoke refresh token, clear cookie
router.post("/logout", authController.logout);

// GET /api/auth/me — verify token + return current user (JWT payload only)
router.get("/me", authenticate, authController.me);

// GET /api/auth/profile — full user profile from DB
router.get("/profile", authenticate, authController.profile);

// POST /api/auth/set-password — invited users set their initial password
router.post(
  "/set-password",
  jsonBody(BODY_LIMIT.tiny),
  validate({ body: setPasswordSchema }),
  authController.setPassword,
);

// POST /api/auth/forgot-password — send password reset email
router.post(
  "/forgot-password",
  jsonBody(BODY_LIMIT.tiny),
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);

// POST /api/auth/reset-password — complete password reset with token
router.post(
  "/reset-password",
  jsonBody(BODY_LIMIT.tiny),
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
);

// ─── MFA Enrollment ──────────────────────────────────────────────────────────

// POST /api/auth/mfa/setup — generate TOTP secret + QR code (does NOT enable MFA yet)
router.post("/mfa/setup", authenticate, mfaController.setup);

// POST /api/auth/mfa/enable — verify TOTP code and activate MFA
router.post(
  "/mfa/enable",
  authenticate,
  jsonBody(BODY_LIMIT.tiny),
  validate({ body: mfaTokenSchema }),
  mfaController.enable,
);

// DELETE /api/auth/mfa — disable MFA (requires valid TOTP code in body)
router.delete(
  "/mfa",
  authenticate,
  jsonBody(BODY_LIMIT.tiny),
  validate({ body: mfaTokenSchema }),
  mfaController.disable,
);

export default router;
