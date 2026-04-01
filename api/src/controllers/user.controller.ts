import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import * as userService from "../services/user.service";

export async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const users = await userService.listUsers(req.user!.orgId);
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
    const user = await userService.createUser(req.user!.orgId, req.body);
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
    await userService.removeUser(
      req.params.id,
      req.user!.orgId,
      req.user!.id,
    );
    res.json({ success: true, data: null, message: "User removed" });
  } catch (err) {
    next(err);
  }
}
