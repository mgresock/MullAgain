import { env } from "./env";

/**
 * All marketplace money math lives here and is computed SERVER-SIDE ONLY from
 * trusted listing/order snapshots. The client never sends amounts.
 */

export interface MoneyBreakdown {
  itemPriceCents: number;
  shippingPriceCents: number;
  taxCents: number;
  /** Platform commission, charged on item price (not shipping). */
  platformFeeCents: number;
  /** What the buyer pays. */
  totalCents: number;
  /** What the seller nets (item + shipping - fee). */
  sellerProceedsCents: number;
}

export interface PriceInput {
  itemPriceCents: number;
  shippingPriceCents?: number;
  taxCents?: number;
  /** Override the platform fee in basis points; defaults to env policy. */
  platformFeeBps?: number;
}

/**
 * Compute the canonical money breakdown for an order.
 *
 * - Platform fee is applied to the item price only.
 * - Seller proceeds = item + shipping - platform fee.
 * - Buyer total = item + shipping + tax.
 *
 * Rounding: fee is rounded to the nearest cent.
 */
export function computeOrderMoney(input: PriceInput): MoneyBreakdown {
  const itemPriceCents = assertNonNegativeInt(input.itemPriceCents, "itemPriceCents");
  const shippingPriceCents = assertNonNegativeInt(
    input.shippingPriceCents ?? 0,
    "shippingPriceCents",
  );
  const taxCents = assertNonNegativeInt(input.taxCents ?? 0, "taxCents");

  const bps = input.platformFeeBps ?? env.PLATFORM_FEE_BPS;
  const platformFeeCents = Math.round((itemPriceCents * bps) / 10000);

  const totalCents = itemPriceCents + shippingPriceCents + taxCents;
  const sellerProceedsCents = itemPriceCents + shippingPriceCents - platformFeeCents;

  return {
    itemPriceCents,
    shippingPriceCents,
    taxCents,
    platformFeeCents,
    totalCents,
    sellerProceedsCents,
  };
}

function assertNonNegativeInt(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid money value for ${name}: ${value} (must be a non-negative integer)`);
  }
  return value;
}

export function formatCents(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}
