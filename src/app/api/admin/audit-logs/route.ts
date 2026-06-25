import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** Audit-log viewer with filters: ?actorUserId, ?entityType, ?action. */
export const GET = route(async (req: NextRequest) => {
  await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const where: Prisma.AuditLogWhereInput = {
    ...(sp.get("actorUserId") ? { actorUserId: sp.get("actorUserId")! } : {}),
    ...(sp.get("entityType") ? { entityType: sp.get("entityType")! } : {}),
    ...(sp.get("action") ? { action: { contains: sp.get("action")!, mode: "insensitive" } } : {}),
  };
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { email: true } } },
  });
  return ok({ logs });
});
