import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireActiveSeller, Errors } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { shipSchema } from "@/lib/validation";
import { orderMachine, shipmentMachine } from "@/lib/state-machines";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { env } from "@/lib/env";

/** Seller adds tracking and marks the order shipped (must be PAID). */
export const POST = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireActiveSeller();
    const { id } = await params;
    const body = shipSchema.parse(await req.json());

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { buyer: { select: { email: true } } },
      });
      if (!order) throw Errors.notFound("Order not found.");
      if (order.sellerId !== user.id) throw Errors.forbidden();
      if (order.status !== "PAID" && order.status !== "SELLER_TO_SHIP") {
        throw Errors.conflict("Order must be paid before it can ship.");
      }
      orderMachine.assertTransition(order.status, "SHIPPED");

      const now = new Date();
      await tx.order.update({
        where: { id: order.id },
        data: { status: "SHIPPED", shippedAt: now },
      });

      await tx.shipment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          carrier: body.carrier,
          trackingNumber: body.trackingNumber,
          trackingUrl: body.trackingUrl,
          status: shipmentMachine.next("NOT_SHIPPED").includes("IN_TRANSIT")
            ? "IN_TRANSIT"
            : "LABEL_CREATED",
          shippedAt: now,
        },
        update: {
          carrier: body.carrier,
          trackingNumber: body.trackingNumber,
          trackingUrl: body.trackingUrl,
          status: "IN_TRANSIT",
          shippedAt: now,
        },
      });

      await audit(
        {
          actorUserId: user.id,
          action: "order.shipped",
          entityType: "Order",
          entityId: order.id,
          metadata: { carrier: body.carrier, trackingNumber: body.trackingNumber },
        },
        tx,
      );
      await notify(
        {
          userId: order.buyerId,
          type: "ORDER_SHIPPED",
          title: "Your order has shipped",
          body: `${body.carrier} · ${body.trackingNumber}`,
          linkUrl: "/dashboard/purchases",
          email: { to: order.buyer.email },
        },
        tx,
      );
      return order;
    });

    return ok({ id: result.id, status: "SHIPPED", autoCompleteHours: env.AUTO_COMPLETE_AFTER_DELIVERY_HOURS });
  },
);
