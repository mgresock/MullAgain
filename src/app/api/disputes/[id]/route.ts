import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireUser, Errors, isAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

/** Dispute detail with evidence and full order context (parties + admin only). */
export const GET = route(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            listing: { select: { title: true, slug: true } },
            shipment: true,
            buyer: { select: { id: true, name: true } },
            seller: { select: { id: true, name: true } },
          },
        },
        evidence: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true } } } },
      },
    });
    if (!dispute) throw Errors.notFound("Dispute not found.");
    const party = user.id === dispute.order.buyerId || user.id === dispute.order.sellerId;
    if (!party && !isAdmin(user)) throw Errors.forbidden();
    return ok(dispute);
  },
);
