export type AuditAction =
  | "organization.update"
  | "project.create"
  | "project.update"
  | "project.delete"
  | "sequence.create"
  | "sequence.update"
  | "sequence.delete"
  | "shot.create"
  | "shot.update"
  | "shot.delete"
  | "user.create"
  | "user.update"
  | "user.delete";

export type AuditResourceType =
  | "Organization"
  | "Project"
  | "Sequence"
  | "Shot"
  | "User";

export interface AuditEntry {
  orgId: string;
  actorId: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  ip?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}