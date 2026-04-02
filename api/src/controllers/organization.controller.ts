import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import * as orgService from "../services/organization.service";
import { auditFromReq } from "../lib/audit/audit";
import { logger } from "../lib/utils/logger";

export async function get(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const org = await orgService.getOrganization(req.user!.orgId);
    logger.debug("organization.get", { orgId: req.user!.orgId });
    res.json({ success: true, data: org });
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
    const org = await orgService.updateOrganization(req.user!.orgId, req.body);
    auditFromReq(req, "organization.update", "Organization", org.id);
    logger.info("organization.update", { orgId: org.id, userId: req.user!.id });
    res.json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
}
