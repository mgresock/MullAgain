import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, route } from "@/lib/api";
import { requireAdmin, Errors } from "@/lib/authz";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { audit, adminAction } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["REVIEWED", "ACTION_TAKEN", "DISMISSED"]),
  note: z.string().max(500).optional(),
});

export const POST = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    await enforceRateLimit("adminSensitive", admin.id);
    const { id } = await params;
    const body = schema.parse(await req.json());

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw Errors.notFound("Report not found.");

    const updated = await prisma.report.update({ where: { id }, data: { status: body.status } });
    await adminAction({ adminUserId: admin.id, action: `report.${body.status.toLowerCase()}`, targetUserId: report.reportedUserId ?? undefined, targetListingId: report.listingId ?? undefined, reason: body.note });
    await audit({ actorUserId: admin.id, action: "admin.report.resolved", entityType: "Report", entityId: id, metadata: { status: body.status } });
    return ok({ id: updated.id, status: updated.status });
  },
);
