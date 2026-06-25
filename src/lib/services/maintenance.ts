import { prisma } from "../prisma";
import { env } from "../env";
import { audit } from "../audit";
import { notify } from "../notifications";
import { cancelUnpaidOrder } from "./orders";

/**
 * Idempotent maintenance pass, intended to run on a schedule (Vercel Cron,
 * Inngest, Trigger.dev, or any job runner hitting /api/cron/maintenance):
 *
 *  1. Auto-complete shipped/delivered orders past the delivery window.
 *  2. Expire reserved-but-unpaid orders past their payment window (returns the
 *     listing to ACTIVE).
 *  3. Expire stale pending/countered offers.
 *
 * Each step is safe to run repeatedly.
 */
export async function runMaintenance(now = new Date()) {
  const result = { autoCompleted: 0, ordersExpired: 0, offersExpired: 0 };

  // 1. Auto-complete.
  const completeBefore = new Date(now.getTime() - env.AUTO_COMPLETE_AFTER_DELIVERY_HOURS * 3600_000);
  const toComplete = await prisma.order.findMany({
    where: { status: { in: ["SHIPPED", "DELIVERED"] }, shippedAt: { lte: completeBefore } },
    select: { id: true, sellerId: true },
  });
  for (const o of toComplete) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: o.id },
        data: { status: "COMPLETED", completedAt: now, deliveredAt: now },
      });
      await tx.sellerProfile.updateMany({ where: { userId: o.sellerId }, data: { totalSales: { increment: 1 } } });
      await audit({ action: "order.auto_completed", entityType: "Order", entityId: o.id }, tx);
    });
    result.autoCompleted++;
  }

  // 2. Expire unpaid reserved orders.
  const expiredOrders = await prisma.order.findMany({
    where: { status: "AWAITING_PAYMENT", expiresAt: { lte: now } },
    select: { id: true, buyerId: true },
  });
  for (const o of expiredOrders) {
    await cancelUnpaidOrder(o.id, "payment_window_expired");
    await notify({ userId: o.buyerId, type: "ORDER_EXPIRED", title: "Reservation expired", body: "Your unpaid order was released.", linkUrl: "/dashboard/purchases" });
    result.ordersExpired++;
  }

  // 3. Expire stale offers.
  const expired = await prisma.offer.updateMany({
    where: { status: { in: ["PENDING", "COUNTERED"] }, expiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });
  result.offersExpired = expired.count;

  return result;
}
