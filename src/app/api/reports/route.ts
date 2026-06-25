import { NextRequest } from "next/server";
import { created, route } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { reportSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

/** Report a listing or user. Lands in the admin reports queue. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = reportSchema.parse(await req.json());
  const report = await prisma.report.create({
    data: {
      reporterId: user.id,
      reportedUserId: body.reportedUserId,
      listingId: body.listingId,
      reason: body.reason,
      description: body.description,
    },
  });
  await audit({ actorUserId: user.id, action: "report.created", entityType: "Report", entityId: report.id, metadata: { ...body } });
  return created({ id: report.id });
});
