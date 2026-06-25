import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { constructWebhookEvent } from "@/lib/integrations/stripe";
import { markOrderPaid } from "@/lib/services/orders";
import { notify } from "@/lib/notifications";

// Stripe needs the raw request body to verify the signature.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(payload, signature);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: record the event id first. If it already exists, we've handled
  // it — return 200 without reprocessing.
  try {
    await prisma.paymentEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        rawJson: event as unknown as object,
        orderId: extractOrderId(event),
      },
    });
  } catch (err) {
    // Unique constraint on stripeEventId → duplicate delivery. Acknowledge.
    if (isUniqueViolation(err)) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw err;
  }

  try {
    await handleEvent(event);
  } catch (err) {
    console.error(`[stripe webhook] handler error for ${event.type}:`, err);
    // Return 500 so Stripe retries; the PaymentEvent row remains for audit.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId && session.payment_status === "paid") {
        const order = await markOrderPaid({
          orderId,
          paymentIntentId: String(session.payment_intent),
          checkoutSessionId: session.id,
        });
        if (order) await notifySellerPaid(order.id);
      }
      break;
    }
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        const order = await markOrderPaid({ orderId, paymentIntentId: pi.id });
        if (order) await notifySellerPaid(order.id);
      }
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const orderId = charge.metadata?.orderId;
      if (orderId) {
        await prisma.order.updateMany({
          where: { id: orderId, status: { not: "REFUNDED" } },
          data: { status: "REFUNDED", stripeRefundId: charge.id },
        });
      }
      break;
    }
    case "account.updated": {
      const acct = event.data.object as Stripe.Account;
      await prisma.sellerProfile.updateMany({
        where: { stripeConnectedAccountId: acct.id },
        data: {
          stripeChargesEnabled: acct.charges_enabled ?? false,
          stripePayoutsEnabled: acct.payouts_enabled ?? false,
          stripeDetailsSubmitted: acct.details_submitted ?? false,
          onboardingComplete:
            Boolean(acct.charges_enabled) && Boolean(acct.payouts_enabled),
        },
      });
      break;
    }
    default:
      // Unhandled event types are acknowledged and ignored.
      break;
  }
}

async function notifySellerPaid(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { listing: { select: { title: true } }, seller: { select: { email: true } } },
  });
  if (!order) return;
  await notify({
    userId: order.sellerId,
    type: "ORDER_PAID",
    title: "You made a sale!",
    body: `"${order.listing.title}" sold. Ship it to release your payout.`,
    linkUrl: "/seller/orders",
    email: { to: order.seller.email },
  });
}

function extractOrderId(event: Stripe.Event): string | null {
  const obj = event.data.object as { metadata?: Record<string, string> };
  return obj?.metadata?.orderId ?? null;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}
