import { describe, it, expect } from "vitest";
import { listingCreateSchema } from "@/lib/validation";

const base = {
  title: "TaylorMade Stealth Driver 10.5",
  description: "A".repeat(60),
  brand: "TaylorMade",
  condition: "EXCELLENT" as const,
  priceCents: 28900,
  quantity: 1,
  allowOffers: true,
  shippingPriceCents: 1500,
};

describe("listingCreateSchema — category-specific required specs", () => {
  it("rejects a DRIVER without loft/handedness/shaftFlex", () => {
    const r = listingCreateSchema.safeParse({ ...base, category: "DRIVERS" });
    expect(r.success).toBe(false);
  });

  it("accepts a DRIVER with the required specs", () => {
    const r = listingCreateSchema.safeParse({
      ...base,
      category: "DRIVERS",
      golfSpecs: { loft: "10.5", handedness: "RIGHT", shaftFlex: "STIFF" },
    });
    expect(r.success).toBe(true);
  });

  it("requires set composition + shaft material for IRON sets", () => {
    const missing = listingCreateSchema.safeParse({
      ...base,
      category: "IRONS",
      golfSpecs: { handedness: "RIGHT", shaftFlex: "REGULAR" },
    });
    expect(missing.success).toBe(false);

    const ok = listingCreateSchema.safeParse({
      ...base,
      category: "IRONS",
      golfSpecs: { handedness: "RIGHT", shaftFlex: "REGULAR", shaftMaterial: "STEEL", setComposition: "5-PW" },
    });
    expect(ok.success).toBe(true);
  });

  it("requires size for apparel", () => {
    const r = listingCreateSchema.safeParse({ ...base, category: "APPAREL" });
    expect(r.success).toBe(false);
  });

  it("enforces the title length floor (8 chars)", () => {
    const r = listingCreateSchema.safeParse({ ...base, title: "short", category: "BALLS" });
    expect(r.success).toBe(false);
  });

  it("rejects a minimum offer above the asking price", () => {
    const r = listingCreateSchema.safeParse({
      ...base,
      category: "BALLS",
      minOfferCents: 30000, // > priceCents 28900
    });
    expect(r.success).toBe(false);
  });
});
