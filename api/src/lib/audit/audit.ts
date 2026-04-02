import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { logger } from "../utils/logger";
import type { AuthenticatedRequest } from "../../types";
import type { AuditAction, AuditEntry, AuditResourceType } from "./types";

/**
 * Fire-and-forget audit helper for controllers.
 * Extracts orgId, actorId, ip, correlationId from the request automatically.
 *
 * Usage: auditFromReq(req, "project.create", "Project", project.id);
 */
export function auditFromReq(
  req: AuthenticatedRequest,
  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId: string,
): void {
  void logAudit({
    orgId: req.user!.orgId,
    actorId: req.user!.id,
    action,
    resourceType,
    resourceId,
    ip: req.ip,
    correlationId: req.correlationId,
  });
}

/**
 * Writes an append-only audit log entry to the database.
 * Errors are swallowed internally — audit failures never break requests.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        orgId: entry.orgId,
        actorId: entry.actorId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        ip: entry.ip ?? null,
        correlationId: entry.correlationId ?? null,
        metadata: entry.metadata
          ? (entry.metadata as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    });
  } catch (err) {
    logger.error("audit log write failed", {
      err,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
    });
  }
}
