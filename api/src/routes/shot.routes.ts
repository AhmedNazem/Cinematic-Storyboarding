import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  createShotSchema,
  updateShotSchema,
} from "../schemas/shot.schema";
import * as shotController from "../controllers/shot.controller";

const router = Router();

router.use(authenticate);

// GET /api/sequences/:sequenceId/shots — list shots in sequence
router.get(
  "/sequences/:sequenceId/shots",
  shotController.list,
);

// GET /api/shots/:id — get shot detail
router.get("/shots/:id", shotController.get);

// POST /api/sequences/:sequenceId/shots — create shot (editor+)
router.post(
  "/sequences/:sequenceId/shots",
  authorize("editor"),
  validate({ body: createShotSchema }),
  shotController.create,
);

// PUT /api/shots/:id — update shot (editor+)
router.put(
  "/shots/:id",
  authorize("editor"),
  validate({ body: updateShotSchema }),
  shotController.update,
);

// DELETE /api/shots/:id — delete shot (admin/owner)
router.delete(
  "/shots/:id",
  authorize("admin"),
  shotController.remove,
);

export default router;
