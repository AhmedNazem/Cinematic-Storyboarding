import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import * as seqService from "../services/sequence.service";
import { auditFromReq } from "../lib/audit/audit";
import { logger } from "../lib/utils/logger";

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
    logger.debug("sequence.list", { projectId: req.params.projectId, orgId: req.user!.orgId });
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
    logger.debug("sequence.get", { sequenceId: req.params.id });
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
    logger.info("sequence.create", { sequenceId: sequence.id, userId: req.user!.id });
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
    logger.info("sequence.update", { sequenceId: sequence.id, userId: req.user!.id });
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
    logger.info("sequence.delete", { sequenceId: req.params.id, userId: req.user!.id });
    res.json({ success: true, data: null, message: "Sequence deleted" });
  } catch (err) {
    next(err);
  }
}
