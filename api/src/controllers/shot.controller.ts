import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import * as shotService from "../services/shot.service";

export async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const shots = await shotService.listShots(
      req.params.sequenceId,
      req.user!.orgId,
    );
    res.json({ success: true, data: shots });
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
    const shot = await shotService.getShot(req.params.id, req.user!.orgId);
    res.json({ success: true, data: shot });
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
    const shot = await shotService.createShot(
      req.params.sequenceId,
      req.user!.orgId,
      req.body,
    );
    res.status(201).json({ success: true, data: shot });
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
    const shot = await shotService.updateShot(
      req.params.id,
      req.user!.orgId,
      req.body,
    );
    res.json({ success: true, data: shot });
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
    await shotService.deleteShot(req.params.id, req.user!.orgId);
    res.json({ success: true, data: null, message: "Shot deleted" });
  } catch (err) {
    next(err);
  }
}
