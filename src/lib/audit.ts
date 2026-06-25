import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

type Db = PrismaClient | Prisma.TransactionClient;

export interface AuditInput {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Write an immutable audit-log entry. Accepts a transaction client so audit
 * rows are committed atomically with the change they describe. Auditing must
 * never throw in a way that breaks the primary mutation — but inside a tx we let
 * it propagate so the whole unit rolls back together.
 */
export async function audit(input: AuditInput, db: Db = prisma) {
  return db.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadataJson: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

/** Convenience for recording an admin action alongside the audit log. */
export async function adminAction(
  data: {
    adminUserId: string;
    action: string;
    reason?: string;
    targetUserId?: string;
    targetListingId?: string;
    targetOrderId?: string;
  },
  db: Db = prisma,
) {
  return db.adminAction.create({ data });
}
