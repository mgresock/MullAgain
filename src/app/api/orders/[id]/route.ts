import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireUser, Errors, isAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

/** Order detail — visible only to its buyer, seller, or an admin. */
export const GET = route(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        listing: { select: { title: true, slug: true } },
        shipment: true,
        dispute: true,
        offer: true,
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
    });
    if (!order) throw Errors.notFound("Order not found.");
    if (order.buyerId !== user.id && order.sellerId !== user.id && !isAdmin(user)) {
      throw Errors.forbidden();
    }
    return ok(order);
  },
);
