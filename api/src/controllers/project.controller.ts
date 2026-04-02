import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import * as projectService from "../services/project.service";
import { auditFromReq } from "../lib/audit/audit";
import { logger } from "../lib/utils/logger";

export async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(req.query.pageSize) || 10),
    );

    const result = await projectService.listProjects(req.user!.orgId, {
      page,
      pageSize,
    });
    logger.debug("project.list", { orgId: req.user!.orgId, page, pageSize, total: result.pagination.total });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function get(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const project = await projectService.getProject(
      req.params.id,
      req.user!.orgId,
    );
    logger.debug("project.get", { projectId: req.params.id });
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const project = await projectService.createProject(req.user!.orgId, req.body);
    auditFromReq(req, "project.create", "Project", project.id);
    logger.info("project.create", { projectId: project.id, userId: req.user!.id });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

export async function update(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const project = await projectService.updateProject(req.params.id, req.user!.orgId, req.body);
    auditFromReq(req, "project.update", "Project", project.id);
    logger.info("project.update", { projectId: project.id, userId: req.user!.id });
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

export async function remove(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await projectService.deleteProject(req.params.id, req.user!.orgId);
    auditFromReq(req, "project.delete", "Project", req.params.id);
    logger.info("project.delete", { projectId: req.params.id, userId: req.user!.id });
    res.json({ success: true, data: null, message: "Project deleted" });
  } catch (err) {
    next(err);
  }
}
