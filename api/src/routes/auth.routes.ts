import { Router } from "express";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { jsonBody, BODY_LIMIT } from "../middleware/body-limit";
import { registerSchema, loginSchema, setPasswordSchema } from "../schemas/auth.schema";
import * as authController from "../controllers/auth.controller";

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

export default router;
