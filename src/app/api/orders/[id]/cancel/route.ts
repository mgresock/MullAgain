import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireUser, Errors, isAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { cancelUnpaidOrder } from "@/lib/services/orders";

/**
 * Cancel an unpaid order (buyer, seller, or admin). Only AWAITING_PAYMENT orders
 * can be cancelled here; paid orders go through refunds/disputes instead.
 */
export const POST = route(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id }, select: { buyerId: true, sellerId: true, status: true } });
    if (!order) throw Errors.notFound("Order not found.");
    if (order.buyerId !== user.id && order.sellerId !== user.id && !isAdmin(user)) {
      throw Errors.forbidden();
    }
    if (order.status !== "AWAITING_PAYMENT" && order.status !== "CREATED") {
      throw Errors.conflict("Only unpaid orders can be cancelled.");
    }
    const cancelled = await cancelUnpaidOrder(id, `cancelled_by_${user.id === order.buyerId ? "buyer" : "seller"}`);
    return ok({ id: cancelled.id, status: "CANCELLED" });
  },
);
