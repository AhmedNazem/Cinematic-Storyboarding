import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../schemas/project.schema";
import { paginationQuerySchema } from "../schemas/pagination.schema";
import * as projectController from "../controllers/project.controller";

const router = Router();

router.use(authenticate);

// GET /api/projects — list projects (paginated)
router.get(
  "/",
  validate({ query: paginationQuerySchema }),
  projectController.list,
);

// GET /api/projects/:id — get project with sequences
router.get("/:id", projectController.get);

// POST /api/projects — create project (editor+)
router.post(
  "/",
  authorize("editor"),
  validate({ body: createProjectSchema }),
  projectController.create,
);

// PUT /api/projects/:id — update project (editor+)
router.put(
  "/:id",
  authorize("editor"),
  validate({ body: updateProjectSchema }),
  projectController.update,
);

// DELETE /api/projects/:id — delete project (admin/owner)
router.delete("/:id", authorize("admin"), projectController.remove);

export default router;
