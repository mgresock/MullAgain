import type { z } from "zod";
import { prisma } from "../prisma";
import { Errors } from "../authz";
import { audit } from "../audit";
import { uniqueListingSlug } from "../slug";
import { buildSearchText } from "./listings";
import { decideListingReview, SELLER_LIMITS } from "../trust-safety";
import { listingMachine } from "../state-machines";
import type { listingCreateSchema, listingUpdateSchema } from "../validation";
import type { SellerProfile } from "@prisma/client";

type CreateInput = z.infer<typeof listingCreateSchema>;
type UpdateInput = z.infer<typeof listingUpdateSchema>;

/**
 * Create a listing as a DRAFT. Enforces per-tier seller limits. Specs are
 * created alongside in a transaction. Publishing (and the ACTIVE vs
 * PENDING_REVIEW decision) happens in `publishListing`.
 */
export async function createListing(sellerId: string, sp: SellerProfile, input: CreateInput) {
  const limits = SELLER_LIMITS[sp.sellerTier];

  if (input.priceCents > limits.maxListingValueCents) {
    throw Errors.forbidden(
      `Your seller tier allows listings up to $${(limits.maxListingValueCents / 100).toFixed(0)}. Higher-value listings require admin approval.`,
    );
  }

  // Sellers with unresolved disputes cannot create new listings.
  const openDisputes = await prisma.dispute.count({
    where: {
      order: { sellerId },
      status: { in: ["OPEN", "NEEDS_SELLER_RESPONSE", "NEEDS_BUYER_RESPONSE", "UNDER_REVIEW"] },
    },
  });
  if (openDisputes > 0) {
    throw Errors.forbidden("Resolve your open disputes before creating new listings.");
  }

  const activeCount = await prisma.listing.count({
    where: { sellerId, status: { in: ["ACTIVE", "RESERVED", "PENDING_REVIEW"] } },
  });
  if (activeCount >= limits.maxActiveListings) {
    throw Errors.forbidden(
      `Your seller tier allows up to ${limits.maxActiveListings} active listings.`,
    );
  }

  const slug = await uniqueListingSlug(input.title);
  const searchText = buildSearchText([
    input.title,
    input.brand,
    input.model,
    input.category,
    input.description,
    input.golfSpecs?.setComposition,
  ]);

  const listing = await prisma.$transaction(async (tx) => {
    const created = await tx.listing.create({
      data: {
        sellerId,
        title: input.title,
        slug,
        description: input.description,
        category: input.category,
        subcategory: input.subcategory,
        brand: input.brand,
        model: input.model,
        condition: input.condition,
        priceCents: input.priceCents,
        originalPriceCents: input.originalPriceCents,
        quantity: input.quantity,
        allowOffers: input.allowOffers,
        minOfferCents: input.minOfferCents,
        shippingType: input.shippingType,
        shippingPriceCents: input.shippingPriceCents,
        locationCity: input.locationCity ?? sp.locationCity,
        locationState: input.locationState ?? sp.locationState,
        searchText,
        status: "DRAFT",
        golfSpecs: input.golfSpecs ? { create: input.golfSpecs } : undefined,
      },
    });
    await audit(
      { actorUserId: sellerId, action: "listing.created", entityType: "Listing", entityId: created.id },
      tx,
    );
    return created;
  });

  return listing;
}

/**
 * Edit a listing the seller owns. Editable only while DRAFT / ACTIVE / REJECTED
 * (not once RESERVED/SOLD). A material edit of an ACTIVE listing re-enters review
 * if trust/safety rules now flag it. Rebuilds the denormalized search text.
 */
export async function updateListing(
  sellerId: string,
  sp: SellerProfile,
  listingId: string,
  input: UpdateInput,
) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({
      where: { id: listingId },
      include: { images: { where: { status: "ACTIVE" } }, golfSpecs: true },
    });
    if (!listing) throw Errors.notFound("Listing not found.");
    if (listing.sellerId !== sellerId) throw Errors.forbidden();
    if (!["DRAFT", "ACTIVE", "REJECTED"].includes(listing.status)) {
      throw Errors.conflict(`Cannot edit a listing in status ${listing.status}.`);
    }

    const { golfSpecs, ...fields } = input;
    const nextPrice = fields.priceCents ?? listing.priceCents;
    if (nextPrice > SELLER_LIMITS[sp.sellerTier].maxListingValueCents) {
      throw Errors.forbidden("New price exceeds your seller tier's listing limit.");
    }

    const searchText = buildSearchText([
      fields.title ?? listing.title,
      fields.brand ?? listing.brand,
      fields.model ?? listing.model,
      listing.category,
      fields.description ?? listing.description,
    ]);

    // Re-evaluate review status only for currently-ACTIVE listings.
    let statusPatch = {};
    if (listing.status === "ACTIVE") {
      const decision = decideListingReview({
        priceCents: nextPrice,
        imageCount: listing.images.length,
        title: fields.title ?? listing.title,
        description: fields.description ?? listing.description,
        seller: sp,
      });
      if (decision.requiresReview) {
        statusPatch = { status: "PENDING_REVIEW", publishedAt: null };
      }
    }

    const updated = await tx.listing.update({
      where: { id: listingId },
      data: {
        ...fields,
        searchText,
        ...statusPatch,
        golfSpecs: golfSpecs
          ? {
              upsert: { create: golfSpecs, update: golfSpecs },
            }
          : undefined,
      },
    });
    await audit(
      { actorUserId: sellerId, action: "listing.updated", entityType: "Listing", entityId: listingId },
      tx,
    );
    return updated;
  });
}

/**
 * Remove a listing the seller owns. DRAFT listings are hard-deleted; published
 * ones are soft-removed (status REMOVED) to preserve order/audit history.
 */
export async function removeOwnListing(sellerId: string, listingId: string) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw Errors.notFound("Listing not found.");
    if (listing.sellerId !== sellerId) throw Errors.forbidden();
    if (["RESERVED", "SOLD"].includes(listing.status)) {
      throw Errors.conflict("Cannot remove a listing with an order in progress.");
    }
    if (listing.status === "DRAFT") {
      await tx.listing.delete({ where: { id: listingId } });
    } else {
      listingMachine.assertTransition(listing.status, "REMOVED");
      await tx.listing.update({ where: { id: listingId }, data: { status: "REMOVED" } });
    }
    await audit(
      { actorUserId: sellerId, action: "listing.removed", entityType: "Listing", entityId: listingId },
      tx,
    );
    return { removed: true };
  });
}

/**
 * Publish a DRAFT listing. Requires the minimum number of ACTIVE images, then
 * routes to ACTIVE or PENDING_REVIEW based on trust/safety rules.
 */
export async function publishListing(sellerId: string, sp: SellerProfile, listingId: string) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({
      where: { id: listingId },
      include: { images: { where: { status: "ACTIVE" } } },
    });
    if (!listing) throw Errors.notFound("Listing not found.");
    if (listing.sellerId !== sellerId) throw Errors.forbidden();
    if (listing.status !== "DRAFT" && listing.status !== "REJECTED") {
      throw Errors.conflict(`Cannot publish a listing in status ${listing.status}.`);
    }
    if (listing.images.length < 3) {
      throw Errors.badRequest("At least 3 photos are required to publish.");
    }

    const decision = decideListingReview({
      priceCents: listing.priceCents,
      imageCount: listing.images.length,
      title: listing.title,
      description: listing.description,
      seller: sp,
    });

    const nextStatus = decision.requiresReview ? "PENDING_REVIEW" : "ACTIVE";
    listingMachine.assertTransition(listing.status, nextStatus);

    const updated = await tx.listing.update({
      where: { id: listing.id },
      data: {
        status: nextStatus,
        publishedAt: nextStatus === "ACTIVE" ? new Date() : null,
      },
    });

    await audit(
      {
        actorUserId: sellerId,
        action: nextStatus === "ACTIVE" ? "listing.published" : "listing.submitted_for_review",
        entityType: "Listing",
        entityId: listing.id,
        metadata: { reasons: decision.reasons },
      },
      tx,
    );

    return { listing: updated, requiresReview: decision.requiresReview, reasons: decision.reasons };
  });
}
