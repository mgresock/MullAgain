import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireVerifiedEmail, Errors } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { orderMachine } from "@/lib/state-machines";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

/**
 * Buyer confirms delivery → order COMPLETED. Bumps the seller's sale counters.
 * (An auto-complete background job would do the same after a delivery window.)
 */
export const POST = route(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedEmail();
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw Errors.notFound("Order not found.");
      if (order.buyerId !== user.id) throw Errors.forbidden();
      if (!orderMachine.canTransition(order.status, "COMPLETED")) {
        throw Errors.conflict(`Cannot complete an order in status ${order.status}.`);
      }

      const now = new Date();
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: "COMPLETED", deliveredAt: order.deliveredAt ?? now, completedAt: now },
      });
      await tx.shipment.updateMany({
        where: { orderId: order.id },
        data: { status: "DELIVERED", deliveredAt: now },
      });
      await tx.sellerProfile.updateMany({
        where: { userId: order.sellerId },
        data: { totalSales: { increment: 1 } },
      });

      await audit(
        { actorUserId: user.id, action: "order.completed", entityType: "Order", entityId: order.id },
        tx,
      );
      await notify(
        {
          userId: order.sellerId,
          type: "ORDER_COMPLETED",
          title: "Order completed",
          body: "The buyer confirmed delivery. Your payout will be released by Stripe.",
          linkUrl: "/seller/orders",
        },
        tx,
      );
      return updated;
    });

    return ok({ id: result.id, status: result.status });
  },
);
