import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { jsonBody, BODY_LIMIT } from "../middleware/body-limit";
import {
  createUserSchema,
  updateUserSchema,
} from "../schemas/user.schema";
import * as userController from "../controllers/user.controller";

const router = Router();

router.use(authenticate);

// GET /api/users — list users in org
router.get("/", userController.list);

// GET /api/users/:id — get user
router.get("/:id", userController.get);

// POST /api/users — invite user (admin/owner)
router.post(
  "/",
  jsonBody(BODY_LIMIT.tiny),
  authorize("admin"),
  validate({ body: createUserSchema }),
  userController.create,
);

// PUT /api/users/:id — update role (admin/owner)
router.put(
  "/:id",
  jsonBody(BODY_LIMIT.tiny),
  authorize("admin"),
  validate({ body: updateUserSchema }),
  userController.update,
);

// DELETE /api/users/:id — remove user (admin/owner)
router.delete("/:id", authorize("admin"), userController.remove);

export default router;
