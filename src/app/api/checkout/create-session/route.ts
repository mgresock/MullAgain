import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, route } from "@/lib/api";
import { requireVerifiedEmail, Errors } from "@/lib/authz";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createCheckoutSession, stripeEnabled } from "@/lib/integrations/stripe";

const schema = z.object({ orderId: z.string().min(1) });

/**
 * Create a Stripe Checkout session for an existing AWAITING_PAYMENT order owned
 * by the requesting buyer. All amounts come from the trusted order snapshot —
 * never from the client.
 */
export const POST = route(async (req: NextRequest) => {
  const user = await requireVerifiedEmail();
  await enforceRateLimit("checkout", user.id);

  const { orderId } = schema.parse(await req.json());

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      listing: { select: { title: true } },
      seller: { select: { sellerProfile: { select: { stripeConnectedAccountId: true } } } },
    },
  });
  if (!order) throw Errors.notFound("Order not found.");
  if (order.buyerId !== user.id) throw Errors.forbidden();
  if (order.status !== "AWAITING_PAYMENT") {
    throw Errors.conflict("This order is not awaiting payment.");
  }

  const connectedAccountId = order.seller.sellerProfile?.stripeConnectedAccountId;
  if (!connectedAccountId) throw Errors.conflict("Seller payout account missing.");

  if (!stripeEnabled()) {
    throw Errors.badRequest(
      "Stripe is not configured. Add STRIPE_SECRET_KEY to enable checkout.",
    );
  }

  const session = await createCheckoutSession({
    orderId: order.id,
    connectedAccountId,
    itemTitle: order.listing.title,
    itemPriceCents: order.itemPriceCents,
    shippingPriceCents: order.shippingPriceCents,
    platformFeeCents: order.platformFeeCents,
    currency: order.currency,
    buyerEmail: user.email,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  return ok({ url: session.url });
});
