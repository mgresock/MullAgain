import { describe, it, expect } from "vitest";
import { computeOrderMoney, formatCents, dollarsToCents } from "@/lib/money";

describe("computeOrderMoney", () => {
  it("applies the platform fee to the item price only", () => {
    const m = computeOrderMoney({
      itemPriceCents: 10000,
      shippingPriceCents: 1500,
      platformFeeBps: 800, // 8%
    });
    expect(m.platformFeeCents).toBe(800); // 8% of 100.00
    expect(m.totalCents).toBe(11500); // buyer pays item + shipping
    expect(m.sellerProceedsCents).toBe(10700); // item + shipping - fee
  });

  it("rounds the fee to the nearest cent", () => {
    const m = computeOrderMoney({ itemPriceCents: 999, platformFeeBps: 800 });
    expect(m.platformFeeCents).toBe(80); // 79.92 -> 80
  });

  it("includes tax in buyer total but not seller proceeds", () => {
    const m = computeOrderMoney({ itemPriceCents: 10000, taxCents: 700, platformFeeBps: 800 });
    expect(m.totalCents).toBe(10700);
    expect(m.sellerProceedsCents).toBe(9200); // 10000 - 800, tax not added
  });

  it("rejects negative or non-integer amounts", () => {
    expect(() => computeOrderMoney({ itemPriceCents: -1 })).toThrow();
    expect(() => computeOrderMoney({ itemPriceCents: 10.5 })).toThrow();
  });

  it("zero fee yields proceeds equal to item + shipping", () => {
    const m = computeOrderMoney({ itemPriceCents: 5000, shippingPriceCents: 500, platformFeeBps: 0 });
    expect(m.sellerProceedsCents).toBe(5500);
    expect(m.platformFeeCents).toBe(0);
  });
});

describe("helpers", () => {
  it("formats cents as USD", () => {
    expect(formatCents(28900)).toBe("$289.00");
  });
  it("converts dollars to cents", () => {
    expect(dollarsToCents(12.34)).toBe(1234);
  });
});
