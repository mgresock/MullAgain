import Stripe from "stripe";
import { env, isStripeConfigured } from "../env";

/**
 * Stripe Connect (marketplace) integration. Each seller gets a connected
 * Express account; buyers pay via Checkout; the platform takes an
 * application fee and the remainder is routed to the seller's account.
 *
 * When STRIPE_SECRET_KEY is absent we expose a "stub" mode so the rest of the
 * app (onboarding UI, order creation) still functions in local dev without
 * real Stripe — stubbed calls return deterministic fake ids and never hit the
 * network. Checkout/webhooks that require real Stripe throw a clear error.
 */

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!isStripeConfigured() || !env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured (set STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET).");
  }
  if (!client) {
    // Pin to the SDK's bundled API version to keep types in sync.
    client = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return client;
}

export const stripeEnabled = isStripeConfigured;

// ── Connected accounts (sellers) ──────────────────────────────────────────────

export async function createConnectedAccount(email: string): Promise<string> {
  if (!stripeEnabled()) return `acct_stub_${cryptoId()}`;
  const account = await stripe().accounts.create({
    type: "express",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: "individual",
    metadata: { platform: "mullagain" },
  });
  return account.id;
}

export async function createOnboardingLink(accountId: string): Promise<string> {
  if (!stripeEnabled()) return `${env.NEXT_PUBLIC_APP_URL}/seller/onboarding?stub=1`;
  const link = await stripe().accountLinks.create({
    account: accountId,
    refresh_url: `${env.NEXT_PUBLIC_APP_URL}/seller/onboarding?refresh=1`,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/seller/onboarding?done=1`,
    type: "account_onboarding",
  });
  return link.url;
}

export interface ConnectStatus {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  currentlyDue: string[];
  eventuallyDue: string[];
  disabledReason: string | null;
}

export async function getConnectStatus(accountId: string): Promise<ConnectStatus> {
  if (!stripeEnabled()) {
    // In stub mode, pretend onboarding completed so dev flows work end-to-end.
    return {
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      currentlyDue: [],
      eventuallyDue: [],
      disabledReason: null,
    };
  }
  const acct = await stripe().accounts.retrieve(accountId);
  return {
    chargesEnabled: acct.charges_enabled ?? false,
    payoutsEnabled: acct.payouts_enabled ?? false,
    detailsSubmitted: acct.details_submitted ?? false,
    currentlyDue: acct.requirements?.currently_due ?? [],
    eventuallyDue: acct.requirements?.eventually_due ?? [],
    disabledReason: acct.requirements?.disabled_reason ?? null,
  };
}

// ── Checkout (buyers) ─────────────────────────────────────────────────────────

export interface CheckoutInput {
  orderId: string;
  connectedAccountId: string;
  itemTitle: string;
  itemPriceCents: number;
  shippingPriceCents: number;
  platformFeeCents: number;
  currency: string;
  buyerEmail: string;
}

export async function createCheckoutSession(input: CheckoutInput) {
  if (!stripeEnabled()) {
    throw new Error("Checkout requires real Stripe keys (cannot run in stub mode).");
  }
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: input.currency,
        product_data: { name: input.itemTitle },
        unit_amount: input.itemPriceCents,
      },
      quantity: 1,
    },
  ];
  if (input.shippingPriceCents > 0) {
    lineItems.push({
      price_data: {
        currency: input.currency,
        product_data: { name: "Shipping" },
        unit_amount: input.shippingPriceCents,
      },
      quantity: 1,
    });
  }

  // Destination charge: funds settle on the platform, application_fee_amount is
  // retained, and the remainder is transferred to the connected seller account.
  return stripe().checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    customer_email: input.buyerEmail,
    payment_intent_data: {
      application_fee_amount: input.platformFeeCents,
      transfer_data: { destination: input.connectedAccountId },
      metadata: { orderId: input.orderId },
    },
    metadata: { orderId: input.orderId },
    success_url: `${env.NEXT_PUBLIC_APP_URL}/checkout/success?order=${input.orderId}`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/checkout/cancel?order=${input.orderId}`,
  });
}

export async function refundPayment(paymentIntentId: string, amountCents?: number) {
  if (!stripeEnabled()) return { id: `re_stub_${cryptoId()}` };
  return stripe().refunds.create({
    payment_intent: paymentIntentId,
    ...(amountCents ? { amount: amountCents } : {}),
    reverse_transfer: true,
    refund_application_fee: true,
  });
}

export function constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  }
  return stripe().webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
}

function cryptoId() {
  return Math.random().toString(36).slice(2, 12);
}
