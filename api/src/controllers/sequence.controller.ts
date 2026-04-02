import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import * as seqService from "../services/sequence.service";
import { auditFromReq } from "../lib/audit/audit";

export async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sequences = await seqService.listSequences(
      req.params.projectId,
      req.user!.orgId,
    );
    res.json({ success: true, data: sequences });
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
    const sequence = await seqService.getSequence(req.params.id, req.user!.orgId);
    res.json({ success: true, data: sequence });
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
    const sequence = await seqService.createSequence(
      req.params.projectId,
      req.user!.orgId,
      req.body,
    );
    auditFromReq(req, "sequence.create", "Sequence", sequence.id);
    res.status(201).json({ success: true, data: sequence });
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
    const sequence = await seqService.updateSequence(
      req.params.id,
      req.user!.orgId,
      req.body,
    );
    auditFromReq(req, "sequence.update", "Sequence", sequence.id);
    res.json({ success: true, data: sequence });
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
    await seqService.deleteSequence(req.params.id, req.user!.orgId);
    auditFromReq(req, "sequence.delete", "Sequence", req.params.id);
    res.json({ success: true, data: null, message: "Sequence deleted" });
  } catch (err) {
    next(err);
  }
}
