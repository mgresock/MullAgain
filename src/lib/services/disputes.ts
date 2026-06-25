import type { z } from "zod";
import { prisma } from "../prisma";
import { Errors } from "../authz";
import { audit, adminAction } from "../audit";
import { disputeMachine, orderMachine } from "../state-machines";
import { notify } from "../notifications";
import { refundPayment } from "../integrations/stripe";
import type { disputeOpenSchema, disputeResolveSchema } from "../validation";

const DISPUTABLE_STATUSES = ["PAID", "SELLER_TO_SHIP", "SHIPPED", "DELIVERED", "COMPLETED"];

export async function openDispute(
  buyerId: string,
  orderId: string,
  input: z.infer<typeof disputeOpenSchema>,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { dispute: true } });
    if (!order) throw Errors.notFound("Order not found.");
    if (order.buyerId !== buyerId) throw Errors.forbidden();
    if (order.dispute) throw Errors.conflict("A dispute already exists for this order.");
    if (!DISPUTABLE_STATUSES.includes(order.status)) {
      throw Errors.conflict("This order is not eligible for a dispute.");
    }

    const dispute = await tx.dispute.create({
      data: {
        orderId,
        openedByUserId: buyerId,
        reason: input.reason,
        description: input.description,
        status: "NEEDS_SELLER_RESPONSE",
      },
    });

    if (orderMachine.canTransition(order.status, "DISPUTED")) {
      await tx.order.update({ where: { id: orderId }, data: { status: "DISPUTED" } });
    }

    await audit(
      { actorUserId: buyerId, action: "dispute.opened", entityType: "Dispute", entityId: dispute.id, metadata: { orderId, reason: input.reason } },
      tx,
    );
    await notify(
      {
        userId: order.sellerId,
        type: "DISPUTE_OPENED",
        title: "A dispute was opened",
        body: `Reason: ${input.reason}. Please respond with evidence.`,
        linkUrl: "/seller/orders",
      },
      tx,
    );
    return dispute;
  });
}

export async function addEvidence(
  userId: string,
  disputeId: string,
  input: z.infer<typeof import("../validation").disputeEvidenceSchema>,
) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { order: { select: { buyerId: true, sellerId: true } } },
  });
  if (!dispute) throw Errors.notFound("Dispute not found.");
  const isParty = userId === dispute.order.buyerId || userId === dispute.order.sellerId;
  if (!isParty) throw Errors.forbidden();

  const evidence = await prisma.disputeEvidence.create({
    data: {
      disputeId,
      userId,
      evidenceType: input.evidenceType,
      content: input.content,
      fileUrl: input.fileUrl,
    },
  });
  // Move dispute forward to UNDER_REVIEW once a party responds.
  if (disputeMachine.canTransition(dispute.status, "UNDER_REVIEW")) {
    await prisma.dispute.update({ where: { id: disputeId }, data: { status: "UNDER_REVIEW" } });
  }
  await audit({ actorUserId: userId, action: "dispute.evidence_added", entityType: "Dispute", entityId: disputeId });
  return evidence;
}

export async function resolveDispute(
  adminId: string,
  disputeId: string,
  input: z.infer<typeof disputeResolveSchema>,
) {
  return prisma.$transaction(async (tx) => {
    const dispute = await tx.dispute.findUnique({
      where: { id: disputeId },
      include: { order: true },
    });
    if (!dispute) throw Errors.notFound("Dispute not found.");
    disputeMachine.assertTransition(dispute.status, input.outcome);

    const closing = ["RESOLVED_BUYER", "RESOLVED_SELLER", "REFUNDED", "CLOSED"].includes(input.outcome);

    // Issue refund when the outcome favors the buyer / explicit refund.
    if (
      (input.outcome === "REFUNDED" || input.outcome === "RESOLVED_BUYER") &&
      dispute.order.stripePaymentIntentId
    ) {
      const refund = await refundPayment(
        dispute.order.stripePaymentIntentId,
        input.refundCents,
      );
      await tx.order.update({
        where: { id: dispute.orderId },
        data: { status: "REFUNDED", stripeRefundId: refund.id },
      });
    }

    const updated = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: input.outcome,
        resolution: input.resolution,
        adminNotes: input.adminNotes,
        closedAt: closing ? new Date() : null,
      },
    });

    await adminAction(
      { adminUserId: adminId, action: `dispute.${input.outcome.toLowerCase()}`, targetOrderId: dispute.orderId, reason: input.resolution },
      tx,
    );
    await audit(
      { actorUserId: adminId, action: "admin.dispute.resolved", entityType: "Dispute", entityId: disputeId, metadata: { outcome: input.outcome } },
      tx,
    );
    await notify(
      { userId: dispute.order.buyerId, type: "DISPUTE_UPDATED", title: "Dispute updated", body: `Outcome: ${input.outcome}`, linkUrl: "/dashboard/disputes" },
      tx,
    );
    await notify(
      { userId: dispute.order.sellerId, type: "DISPUTE_UPDATED", title: "Dispute updated", body: `Outcome: ${input.outcome}`, linkUrl: "/seller/orders" },
      tx,
    );
    return updated;
  });
}
