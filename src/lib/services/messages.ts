import { prisma } from "../prisma";
import { Errors } from "../authz";
import { audit } from "../audit";
import { notify } from "../notifications";
import { detectOffPlatformSolicitation } from "../trust-safety";

/**
 * Start (or reuse) a buyer↔seller thread for a listing and post the first
 * message. Buyers cannot message their own listing. Messages soliciting
 * off-platform payment are blocked (kept on-platform for buyer protection).
 */
export async function startThread(buyerId: string, listingId: string, body: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true },
  });
  if (!listing) throw Errors.notFound("Listing not found.");
  if (listing.sellerId === buyerId) throw Errors.forbidden("You cannot message your own listing.");
  if (detectOffPlatformSolicitation(body)) {
    throw Errors.badRequest("For your protection, keep payment and contact on MullAgain.");
  }

  const thread = await prisma.messageThread.upsert({
    where: {
      listingId_buyerId_sellerId: { listingId, buyerId, sellerId: listing.sellerId },
    },
    create: { listingId, buyerId, sellerId: listing.sellerId },
    update: { updatedAt: new Date() },
  });

  await prisma.message.create({ data: { threadId: thread.id, senderId: buyerId, body } });
  await audit({ actorUserId: buyerId, action: "thread.started", entityType: "MessageThread", entityId: thread.id });
  await notify({
    userId: listing.sellerId,
    type: "MESSAGE",
    title: "New message about your listing",
    body: body.slice(0, 120),
    linkUrl: "/dashboard/messages",
  });
  return thread;
}

export async function postMessage(userId: string, threadId: string, body: string) {
  const thread = await prisma.messageThread.findUnique({ where: { id: threadId } });
  if (!thread) throw Errors.notFound("Thread not found.");
  if (userId !== thread.buyerId && userId !== thread.sellerId) throw Errors.forbidden();

  // Off-platform solicitation is blocked and recorded as a flagged attempt.
  if (detectOffPlatformSolicitation(body)) {
    await audit({
      actorUserId: userId,
      action: "message.blocked_solicitation",
      entityType: "MessageThread",
      entityId: threadId,
    });
    throw Errors.badRequest("For your protection, keep payment and contact on MullAgain.");
  }

  const message = await prisma.message.create({ data: { threadId, senderId: userId, body } });
  await prisma.messageThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });

  const recipientId = userId === thread.buyerId ? thread.sellerId : thread.buyerId;
  await notify({
    userId: recipientId,
    type: "MESSAGE",
    title: "New message",
    body: body.slice(0, 120),
    linkUrl: "/dashboard/messages",
  });
  return message;
}

export async function listThreads(userId: string) {
  return prisma.messageThread.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    orderBy: { updatedAt: "desc" },
    include: {
      listing: { select: { title: true, slug: true } },
      buyer: { select: { id: true, name: true, username: true } },
      seller: { select: { id: true, name: true, username: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export async function getThreadMessages(userId: string, threadId: string) {
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: { messages: { orderBy: { createdAt: "asc" } }, listing: { select: { title: true, slug: true } } },
  });
  if (!thread) throw Errors.notFound("Thread not found.");
  if (userId !== thread.buyerId && userId !== thread.sellerId) throw Errors.forbidden();
  return thread;
}
