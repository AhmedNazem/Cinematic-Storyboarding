import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { jsonBody, BODY_LIMIT } from "../middleware/body-limit";
import { requireMfa } from "../middleware/require-mfa";
import {
  createSequenceSchema,
  updateSequenceSchema,
} from "../schemas/sequence.schema";
import * as seqController from "../controllers/sequence.controller";

const router = Router();

router.use(authenticate);

// GET /api/projects/:projectId/sequences — list sequences in project
router.get(
  "/projects/:projectId/sequences",
  seqController.list,
);

// GET /api/sequences/:id — get sequence with shots
router.get("/sequences/:id", seqController.get);

// POST /api/projects/:projectId/sequences — create in project (editor+)
router.post(
  "/projects/:projectId/sequences",
  jsonBody(BODY_LIMIT.small),
  authorize("editor"),
  validate({ body: createSequenceSchema }),
  seqController.create,
);

// PUT /api/sequences/:id — update sequence (editor+)
router.put(
  "/sequences/:id",
  jsonBody(BODY_LIMIT.small),
  authorize("editor"),
  validate({ body: updateSequenceSchema }),
  seqController.update,
);

// DELETE /api/sequences/:id — delete sequence (admin/owner)
router.delete(
  "/sequences/:id",
  authorize("admin"),
  requireMfa,
  seqController.remove,
);

export default router;
