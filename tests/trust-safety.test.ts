import { describe, it, expect } from "vitest";
import {
  scanSuspiciousKeywords,
  detectOffPlatformSolicitation,
  decideListingReview,
} from "@/lib/trust-safety";

describe("scanSuspiciousKeywords", () => {
  it("flags counterfeit / off-platform terms", () => {
    expect(scanSuspiciousKeywords("Brand new replica Scotty").flagged).toBe(true);
    expect(scanSuspiciousKeywords("Venmo only, no fees").flagged).toBe(true);
  });
  it("passes clean listings", () => {
    expect(scanSuspiciousKeywords("TaylorMade Stealth driver, excellent").flagged).toBe(false);
  });
});

describe("detectOffPlatformSolicitation", () => {
  it("catches payment app + phone number solicitation", () => {
    expect(detectOffPlatformSolicitation("pay me on cashapp")).toBe(true);
    expect(detectOffPlatformSolicitation("text me 555-123-4567")).toBe(true);
  });
  it("ignores normal messages", () => {
    expect(detectOffPlatformSolicitation("Is the shaft stiff flex?")).toBe(false);
  });
});

describe("decideListingReview", () => {
  const trustedSeller = { sellerTier: "TRUSTED" as const, totalSales: 40 };
  const newSeller = { sellerTier: "NEW" as const, totalSales: 0 };

  it("sends new-seller listings to review", () => {
    const d = decideListingReview({
      priceCents: 10000,
      imageCount: 4,
      title: "Ping irons",
      description: "x".repeat(50),
      seller: newSeller,
    });
    expect(d.requiresReview).toBe(true);
    expect(d.reasons).toContain("new_seller");
  });

  it("auto-approves a clean trusted-seller listing", () => {
    const d = decideListingReview({
      priceCents: 10000,
      imageCount: 4,
      title: "Ping irons",
      description: "x".repeat(50),
      seller: trustedSeller,
    });
    expect(d.requiresReview).toBe(false);
  });

  it("flags high-value and thin listings even for trusted sellers", () => {
    const d = decideListingReview({
      priceCents: 200000,
      imageCount: 2,
      title: "Tour bag",
      description: "x".repeat(50),
      seller: trustedSeller,
    });
    expect(d.requiresReview).toBe(true);
    expect(d.reasons).toContain("high_value");
    expect(d.reasons).toContain("too_few_photos");
  });
});
