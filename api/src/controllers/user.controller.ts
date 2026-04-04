import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import * as userService from "../services/user.service";
import { auditFromReq } from "../lib/audit/audit";
import { logger } from "../lib/utils/logger";

export async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const users = await userService.listUsers(req.user!.orgId);
    logger.debug("user.list", { orgId: req.user!.orgId });
    res.json({ success: true, data: users });
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
    const user = await userService.getUser(req.params.id, req.user!.orgId);
    logger.debug("user.get", { userId: req.params.id });
    res.json({ success: true, data: user });
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
    const user = await userService.createUser(req.user!.orgId, req.body, req.user!.id);
    auditFromReq(req, "user.create", "User", user.id);
    logger.info("user.create", { userId: user.id, orgId: req.user!.orgId });
    res.status(201).json({ success: true, data: user });
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
    const user = await userService.updateUser(
      req.params.id,
      req.user!.orgId,
      req.user!.id,
      req.body,
    );
    auditFromReq(req, "user.update", "User", user.id);
    logger.info("user.update", { userId: user.id, actorId: req.user!.id });
    res.json({ success: true, data: user });
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
    await userService.removeUser(req.params.id, req.user!.orgId, req.user!.id);
    auditFromReq(req, "user.delete", "User", req.params.id);
    logger.info("user.delete", { userId: req.params.id, actorId: req.user!.id });
    res.json({ success: true, data: null, message: "User removed" });
  } catch (err) {
    next(err);
  }
}
