import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { jsonBody, BODY_LIMIT } from "../middleware/body-limit";
import { requireMfa } from "../middleware/require-mfa";
import { updateOrganizationSchema } from "../schemas/organization.schema";
import * as orgController from "../controllers/organization.controller";

const router = Router();

// All org routes require authentication
router.use(authenticate);

// GET /api/organizations — get user's own org
router.get("/", orgController.get);

// PUT /api/organizations — update org (admin/owner only)
router.put(
  "/",
  jsonBody(BODY_LIMIT.small),
  authorize("admin"),
  requireMfa,
  validate({ body: updateOrganizationSchema }),
  orgController.update,
);

export default router;
