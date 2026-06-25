import { prisma } from "../prisma";
import { Errors } from "../authz";
import { audit } from "../audit";
import { offerMachine } from "../state-machines";
import { notify } from "../notifications";
import { env } from "../env";
import { createBuyNowOrder } from "./orders";

function expiry() {
  return new Date(Date.now() + env.OFFER_EXPIRY_HOURS * 60 * 60 * 1000);
}

/** Buyer creates an offer on a listing that allows offers. */
export async function createOffer(opts: {
  buyerId: string;
  listingId: string;
  amountCents: number;
  message?: string;
}) {
  const listing = await prisma.listing.findUnique({ where: { id: opts.listingId } });
  if (!listing) throw Errors.notFound("Listing not found.");
  if (listing.status !== "ACTIVE") throw Errors.conflict("Listing is not available.");
  if (listing.sellerId === opts.buyerId) throw Errors.forbidden("You cannot offer on your own listing.");
  if (!listing.allowOffers) throw Errors.badRequest("This listing does not accept offers.");
  if (listing.minOfferCents && opts.amountCents < listing.minOfferCents) {
    throw Errors.badRequest("Offer is below the seller's minimum.");
  }
  if (opts.amountCents >= listing.priceCents) {
    throw Errors.badRequest("Offer must be below the asking price — use Buy Now instead.");
  }

  // Only one active offer branch per buyer/listing.
  const activeExisting = await prisma.offer.findFirst({
    where: {
      listingId: opts.listingId,
      buyerId: opts.buyerId,
      status: { in: ["PENDING", "COUNTERED"] },
    },
  });
  if (activeExisting) throw Errors.conflict("You already have an active offer on this listing.");

  const offer = await prisma.offer.create({
    data: {
      listingId: opts.listingId,
      buyerId: opts.buyerId,
      sellerId: listing.sellerId,
      amountCents: opts.amountCents,
      message: opts.message,
      expiresAt: expiry(),
      status: "PENDING",
    },
  });

  await audit({
    actorUserId: opts.buyerId,
    action: "offer.created",
    entityType: "Offer",
    entityId: offer.id,
    metadata: { listingId: opts.listingId, amountCents: opts.amountCents },
  });
  await notify({
    userId: listing.sellerId,
    type: "OFFER_RECEIVED",
    title: "New offer received",
    body: `You received an offer of $${(opts.amountCents / 100).toFixed(2)}.`,
    linkUrl: "/seller/offers",
  });

  return offer;
}

async function loadOfferForActor(offerId: string) {
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer) throw Errors.notFound("Offer not found.");
  return offer;
}

/** Seller accepts an offer → reserves a discounted order for the buyer. */
export async function acceptOffer(sellerId: string, offerId: string) {
  const offer = await loadOfferForActor(offerId);
  if (offer.sellerId !== sellerId) throw Errors.forbidden();
  offerMachine.assertTransition(offer.status, "ACCEPTED");

  await prisma.offer.update({ where: { id: offer.id }, data: { status: "ACCEPTED" } });

  // Create the reserved order at the offer price.
  const { order } = await createBuyNowOrder({
    buyerId: offer.buyerId,
    listingId: offer.listingId,
    offerId: offer.id,
    itemPriceCentsOverride: offer.amountCents,
  });

  await audit({
    actorUserId: sellerId,
    action: "offer.accepted",
    entityType: "Offer",
    entityId: offer.id,
    metadata: { orderId: order.id },
  });
  await notify({
    userId: offer.buyerId,
    type: "OFFER_ACCEPTED",
    title: "Your offer was accepted!",
    body: "Complete payment to secure your item before it expires.",
    linkUrl: "/dashboard/purchases",
  });

  return { offer, orderId: order.id };
}

export async function rejectOffer(sellerId: string, offerId: string) {
  const offer = await loadOfferForActor(offerId);
  if (offer.sellerId !== sellerId) throw Errors.forbidden();
  offerMachine.assertTransition(offer.status, "REJECTED");
  const updated = await prisma.offer.update({
    where: { id: offer.id },
    data: { status: "REJECTED" },
  });
  await audit({ actorUserId: sellerId, action: "offer.rejected", entityType: "Offer", entityId: offer.id });
  await notify({
    userId: offer.buyerId,
    type: "OFFER_REJECTED",
    title: "Offer declined",
    body: "The seller declined your offer.",
    linkUrl: `/marketplace`,
  });
  return updated;
}

/** Seller counters → original becomes COUNTERED, a new linked offer is created. */
export async function counterOffer(sellerId: string, offerId: string, amountCents: number, message?: string) {
  const offer = await loadOfferForActor(offerId);
  if (offer.sellerId !== sellerId) throw Errors.forbidden();
  offerMachine.assertTransition(offer.status, "COUNTERED");

  return prisma.$transaction(async (tx) => {
    await tx.offer.update({ where: { id: offer.id }, data: { status: "COUNTERED" } });
    const counter = await tx.offer.create({
      data: {
        listingId: offer.listingId,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        amountCents,
        message,
        parentOfferId: offer.id,
        expiresAt: expiry(),
        status: "PENDING",
      },
    });
    await audit(
      {
        actorUserId: sellerId,
        action: "offer.countered",
        entityType: "Offer",
        entityId: counter.id,
        metadata: { parentOfferId: offer.id, amountCents },
      },
      tx,
    );
    await notify(
      {
        userId: offer.buyerId,
        type: "OFFER_COUNTERED",
        title: "Counteroffer received",
        body: `The seller countered at $${(amountCents / 100).toFixed(2)}.`,
        linkUrl: "/dashboard",
      },
      tx,
    );
    return counter;
  });
}

/** Buyer cancels their own pending offer. */
export async function cancelOffer(buyerId: string, offerId: string) {
  const offer = await loadOfferForActor(offerId);
  if (offer.buyerId !== buyerId) throw Errors.forbidden();
  offerMachine.assertTransition(offer.status, "CANCELLED");
  const updated = await prisma.offer.update({
    where: { id: offer.id },
    data: { status: "CANCELLED" },
  });
  await audit({ actorUserId: buyerId, action: "offer.cancelled", entityType: "Offer", entityId: offer.id });
  return updated;
}
