import { env } from "./env";
import type { SellerProfile } from "@prisma/client";

/**
 * Trust & safety heuristics. These are intentionally conservative: they push
 * borderline content to manual review rather than blocking outright, except for
 * off-platform payment solicitation in messages which is hard-blocked.
 */

const SUSPICIOUS_KEYWORDS = [
  "replica",
  "fake",
  "counterfeit",
  "knockoff",
  "knock-off",
  "venmo only",
  "venmo",
  "cashapp",
  "cash app",
  "zelle",
  "paypal friends",
  "f&f",
  "friends and family",
  "outside app",
  "off platform",
  "off-platform",
  "text me",
  "whatsapp",
  "wire transfer",
  "western union",
  "gift card",
];

const OFF_PLATFORM_PAYMENT_PATTERNS: RegExp[] = [
  /\bvenmo\b/i,
  /\bcash\s?app\b/i,
  /\bzelle\b/i,
  /\bpaypal\b.*\b(f&f|friends)\b/i,
  /\bwire\s+transfer\b/i,
  /\bwestern\s+union\b/i,
  /\b(text|call|whatsapp)\s+me\b/i,
  // bare phone numbers
  /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
];

export interface ContentFlagResult {
  flagged: boolean;
  matched: string[];
}

export function scanSuspiciousKeywords(text: string): ContentFlagResult {
  const lower = text.toLowerCase();
  const matched = SUSPICIOUS_KEYWORDS.filter((k) => lower.includes(k));
  return { flagged: matched.length > 0, matched };
}

/** Returns true if a message appears to solicit off-platform payment/contact. */
export function detectOffPlatformSolicitation(text: string): boolean {
  return OFF_PLATFORM_PAYMENT_PATTERNS.some((re) => re.test(text));
}

export interface ListingReviewContext {
  priceCents: number;
  imageCount: number;
  title: string;
  description: string;
  seller: Pick<SellerProfile, "sellerTier" | "totalSales">;
}

export interface ListingReviewDecision {
  requiresReview: boolean;
  reasons: string[];
}

/**
 * Decide whether a freshly created/edited listing should go ACTIVE immediately
 * or to PENDING_REVIEW. New sellers, high-value items, thin listings, and
 * suspicious wording all trigger review.
 */
export function decideListingReview(ctx: ListingReviewContext): ListingReviewDecision {
  const reasons: string[] = [];

  const isNewSeller = ctx.seller.sellerTier === "NEW" || ctx.seller.totalSales === 0;

  if (ctx.priceCents >= env.HIGH_VALUE_REVIEW_THRESHOLD_CENTS) {
    reasons.push("high_value");
  }
  if (env.REQUIRE_LISTING_REVIEW_FOR_NEW_SELLERS && isNewSeller) {
    reasons.push("new_seller");
  }
  if (ctx.imageCount < 3) {
    reasons.push("too_few_photos");
  }

  const kw = scanSuspiciousKeywords(`${ctx.title} ${ctx.description}`);
  if (kw.flagged) {
    reasons.push(`suspicious_keywords:${kw.matched.join(",")}`);
  }

  return { requiresReview: reasons.length > 0, reasons };
}

// Seller trust limits.
export const SELLER_LIMITS = {
  NEW: { maxActiveListings: 5, maxListingValueCents: 50000 },
  VERIFIED: { maxActiveListings: 50, maxListingValueCents: 500000 },
  TRUSTED: { maxActiveListings: 200, maxListingValueCents: 2000000 },
  POWER_SELLER: { maxActiveListings: 1000, maxListingValueCents: 10000000 },
} as const;
