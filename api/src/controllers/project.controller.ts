import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import * as projectService from "../services/project.service";

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
    const project = await projectService.createProject(
      req.user!.orgId,
      req.body,
    );
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
    const project = await projectService.updateProject(
      req.params.id,
      req.user!.orgId,
      req.body,
    );
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
    res.json({ success: true, data: null, message: "Project deleted" });
  } catch (err) {
    next(err);
  }
}
