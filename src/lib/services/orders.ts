import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { computeOrderMoney } from "../money";
import { listingMachine, orderMachine } from "../state-machines";
import { Errors } from "../authz";
import { audit } from "../audit";
import { env } from "../env";

/**
 * Create a buy-now order atomically:
 *  - Re-validates listing is ACTIVE and buyer != seller and seller can receive payouts.
 *  - Snapshots all money server-side (client never sends amounts).
 *  - Reserves the listing (ACTIVE -> RESERVED) so it can't be double-sold.
 *  - Creates the order in AWAITING_PAYMENT with an expiry window.
 *
 * Returns the created order. The Stripe Checkout session is created separately
 * and the order only becomes PAID via webhook.
 */
export async function createBuyNowOrder(opts: {
  buyerId: string;
  listingId: string;
  offerId?: string;
  /** Overrides the item price (used when an offer was accepted). */
  itemPriceCentsOverride?: number;
}) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({
      where: { id: opts.listingId },
      include: {
        seller: { include: { sellerProfile: true, verification: true } },
      },
    });

    if (!listing) throw Errors.notFound("Listing not found.");
    if (listing.sellerId === opts.buyerId) {
      throw Errors.forbidden("You cannot buy your own listing.");
    }
    if (listing.status !== "ACTIVE") {
      throw Errors.conflict("This listing is no longer available.");
    }

    const seller = listing.seller;
    if (seller.accountStatus !== "ACTIVE") {
      throw Errors.conflict("This seller is not currently active.");
    }
    const sp = seller.sellerProfile;
    if (!sp?.stripeConnectedAccountId || !sp.stripePayoutsEnabled || !sp.stripeChargesEnabled) {
      throw Errors.conflict("This seller cannot accept payments right now.");
    }

    const itemPriceCents = opts.itemPriceCentsOverride ?? listing.priceCents;
    const money = computeOrderMoney({
      itemPriceCents,
      shippingPriceCents: listing.shippingPriceCents,
    });

    // Reserve the listing — enforce the state transition.
    listingMachine.assertTransition(listing.status, "RESERVED");
    await tx.listing.update({
      where: { id: listing.id },
      data: { status: "RESERVED" },
    });

    const expiresAt = new Date(Date.now() + env.OFFER_EXPIRY_HOURS * 60 * 60 * 1000);

    const order = await tx.order.create({
      data: {
        buyerId: opts.buyerId,
        sellerId: listing.sellerId,
        listingId: listing.id,
        offerId: opts.offerId,
        status: "AWAITING_PAYMENT",
        itemPriceCents: money.itemPriceCents,
        shippingPriceCents: money.shippingPriceCents,
        taxCents: money.taxCents,
        platformFeeCents: money.platformFeeCents,
        totalCents: money.totalCents,
        sellerProceedsCents: money.sellerProceedsCents,
        currency: listing.currency,
        expiresAt,
      },
    });

    await audit(
      {
        actorUserId: opts.buyerId,
        action: "order.created",
        entityType: "Order",
        entityId: order.id,
        metadata: { listingId: listing.id, totalCents: money.totalCents, offerId: opts.offerId },
      },
      tx,
    );

    return { order, listing, connectedAccountId: sp.stripeConnectedAccountId };
  });
}

/**
 * Release a reserved-but-unpaid order: cancel the order and return the listing
 * to ACTIVE. Idempotent-ish — no-ops if already in a terminal state.
 */
export async function cancelUnpaidOrder(orderId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw Errors.notFound();
    if (!orderMachine.canTransition(order.status, "CANCELLED")) return order;

    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    const listing = await tx.listing.findUnique({ where: { id: order.listingId } });
    if (listing && listing.status === "RESERVED") {
      await tx.listing.update({ where: { id: listing.id }, data: { status: "ACTIVE" } });
    }
    await audit(
      {
        action: "order.cancelled",
        entityType: "Order",
        entityId: order.id,
        metadata: { reason },
      },
      tx,
    );
    return order;
  });
}

/**
 * Mark an order PAID. Called ONLY from the Stripe webhook. Idempotent: if the
 * order is already past AWAITING_PAYMENT this is a no-op.
 */
export async function markOrderPaid(opts: {
  orderId: string;
  paymentIntentId: string;
  checkoutSessionId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: opts.orderId } });
    if (!order) return null;
    if (order.status !== "AWAITING_PAYMENT" && order.status !== "CREATED") {
      return order; // already processed
    }

    orderMachine.assertTransition(order.status, "PAID");
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        stripePaymentIntentId: opts.paymentIntentId,
        ...(opts.checkoutSessionId ? { stripeCheckoutSessionId: opts.checkoutSessionId } : {}),
      },
    });

    // Lock in the sale: RESERVED -> SOLD.
    const listing = await tx.listing.findUnique({ where: { id: order.listingId } });
    if (listing && listingMachine.canTransition(listing.status, "SOLD")) {
      await tx.listing.update({
        where: { id: listing.id },
        data: { status: "SOLD", soldAt: new Date() },
      });
    }

    await audit(
      {
        action: "order.paid",
        entityType: "Order",
        entityId: order.id,
        metadata: { paymentIntentId: opts.paymentIntentId },
      },
      tx,
    );
    return updated;
  });
}

export type CreatedOrder = Prisma.PromiseReturnType<typeof createBuyNowOrder>;
