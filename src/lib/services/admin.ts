import { prisma } from "../prisma";
import { Errors } from "../authz";
import { audit, adminAction } from "../audit";
import { listingMachine } from "../state-machines";
import { notify } from "../notifications";

export async function approveListing(adminId: string, listingId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw Errors.notFound("Listing not found.");
    listingMachine.assertTransition(listing.status, "ACTIVE");
    const updated = await tx.listing.update({
      where: { id: listingId },
      data: { status: "ACTIVE", publishedAt: new Date(), rejectionReason: null },
    });
    await adminAction({ adminUserId: adminId, action: "listing.approve", targetListingId: listingId, reason }, tx);
    await audit({ actorUserId: adminId, action: "admin.listing.approved", entityType: "Listing", entityId: listingId }, tx);
    await notify(
      {
        userId: listing.sellerId,
        type: "LISTING_APPROVED",
        title: "Your listing is live",
        body: `"${listing.title}" was approved and is now active.`,
        linkUrl: `/marketplace/${listing.slug}`,
      },
      tx,
    );
    return updated;
  });
}

export async function rejectListing(adminId: string, listingId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw Errors.notFound("Listing not found.");
    listingMachine.assertTransition(listing.status, "REJECTED");
    const updated = await tx.listing.update({
      where: { id: listingId },
      data: { status: "REJECTED", rejectionReason: reason ?? "Did not meet listing guidelines." },
    });
    await adminAction({ adminUserId: adminId, action: "listing.reject", targetListingId: listingId, reason }, tx);
    await audit({ actorUserId: adminId, action: "admin.listing.rejected", entityType: "Listing", entityId: listingId, metadata: { reason } }, tx);
    await notify(
      {
        userId: listing.sellerId,
        type: "LISTING_REJECTED",
        title: "Listing needs changes",
        body: reason ?? "Your listing was not approved.",
        linkUrl: "/seller/listings",
      },
      tx,
    );
    return updated;
  });
}

export async function removeListing(adminId: string, listingId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw Errors.notFound("Listing not found.");
    listingMachine.assertTransition(listing.status, "REMOVED");
    const updated = await tx.listing.update({ where: { id: listingId }, data: { status: "REMOVED" } });
    await adminAction({ adminUserId: adminId, action: "listing.remove", targetListingId: listingId, reason }, tx);
    await audit({ actorUserId: adminId, action: "admin.listing.removed", entityType: "Listing", entityId: listingId, metadata: { reason } }, tx);
    return updated;
  });
}

export async function setUserStatus(
  adminId: string,
  targetUserId: string,
  accountStatus: "ACTIVE" | "SUSPENDED" | "BANNED",
  reason?: string,
) {
  if (targetUserId === adminId) throw Errors.badRequest("You cannot change your own status.");
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw Errors.notFound("User not found.");
    if (target.role === "SUPER_ADMIN") throw Errors.forbidden("Cannot modify a super admin.");

    const updated = await tx.user.update({ where: { id: targetUserId }, data: { accountStatus } });
    await adminAction({ adminUserId: adminId, action: `user.${accountStatus.toLowerCase()}`, targetUserId, reason }, tx);
    await audit({ actorUserId: adminId, action: "admin.user.status_changed", entityType: "User", entityId: targetUserId, metadata: { accountStatus, reason } }, tx);
    return updated;
  });
}
