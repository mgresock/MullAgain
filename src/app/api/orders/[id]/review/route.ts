import { NextRequest } from "next/server";
import { created, route } from "@/lib/api";
import { requireVerifiedEmail, Errors } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

/**
 * Leave a review for a completed order. Either party can review the other.
 * Recomputes the reviewee's seller rating when applicable.
 */
export const POST = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedEmail();
    const { id } = await params;
    const body = reviewSchema.parse(await req.json());

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw Errors.notFound("Order not found.");
    const isParty = user.id === order.buyerId || user.id === order.sellerId;
    if (!isParty) throw Errors.forbidden();
    if (!["DELIVERED", "COMPLETED"].includes(order.status)) {
      throw Errors.conflict("You can review once the order is delivered or completed.");
    }

    const revieweeId = user.id === order.buyerId ? order.sellerId : order.buyerId;

    const existing = await prisma.review.findUnique({
      where: { orderId_reviewerId: { orderId: id, reviewerId: user.id } },
    });
    if (existing) throw Errors.conflict("You already reviewed this order.");

    const review = await prisma.$transaction(async (tx) => {
      const r = await tx.review.create({
        data: { orderId: id, reviewerId: user.id, revieweeId, rating: body.rating, comment: body.comment },
      });

      // If the reviewee is a seller, refresh their aggregate rating.
      const agg = await tx.review.aggregate({
        where: { revieweeId },
        _avg: { rating: true },
        _count: true,
      });
      await tx.sellerProfile.updateMany({
        where: { userId: revieweeId },
        data: { averageRating: agg._avg.rating ?? 0, ratingCount: agg._count },
      });

      await audit({ actorUserId: user.id, action: "review.created", entityType: "Review", entityId: r.id }, tx);
      await notify(
        { userId: revieweeId, type: "REVIEW_RECEIVED", title: "You received a review", body: `${body.rating}★`, linkUrl: "/dashboard" },
        tx,
      );
      return r;
    });

    return created({ id: review.id });
  },
);
