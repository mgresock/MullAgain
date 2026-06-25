import { describe, it, expect } from "vitest";
import {
  listingMachine,
  orderMachine,
  offerMachine,
  disputeMachine,
  IllegalTransitionError,
} from "@/lib/state-machines";

describe("listingMachine", () => {
  it("allows DRAFT -> ACTIVE and ACTIVE -> RESERVED -> SOLD", () => {
    expect(listingMachine.canTransition("DRAFT", "ACTIVE")).toBe(true);
    expect(listingMachine.canTransition("ACTIVE", "RESERVED")).toBe(true);
    expect(listingMachine.canTransition("RESERVED", "SOLD")).toBe(true);
  });
  it("forbids SOLD -> ACTIVE", () => {
    expect(listingMachine.canTransition("SOLD", "ACTIVE")).toBe(false);
    expect(() => listingMachine.assertTransition("SOLD", "ACTIVE")).toThrow(IllegalTransitionError);
  });
  it("treats same-state as a no-op transition", () => {
    expect(listingMachine.canTransition("ACTIVE", "ACTIVE")).toBe(true);
  });
});

describe("orderMachine", () => {
  it("only allows PAID from AWAITING_PAYMENT (or CREATED)", () => {
    expect(orderMachine.canTransition("AWAITING_PAYMENT", "PAID")).toBe(true);
    expect(orderMachine.canTransition("SHIPPED", "PAID")).toBe(false);
  });
  it("allows the happy path through to COMPLETED", () => {
    expect(orderMachine.canTransition("PAID", "SHIPPED")).toBe(true);
    expect(orderMachine.canTransition("SHIPPED", "DELIVERED")).toBe(true);
    expect(orderMachine.canTransition("DELIVERED", "COMPLETED")).toBe(true);
  });
  it("cannot leave a terminal CANCELLED/REFUNDED state", () => {
    expect(orderMachine.next("CANCELLED")).toEqual([]);
    expect(orderMachine.next("REFUNDED")).toEqual([]);
  });
});

describe("offerMachine", () => {
  it("permits accept/reject/counter from PENDING", () => {
    expect(offerMachine.canTransition("PENDING", "ACCEPTED")).toBe(true);
    expect(offerMachine.canTransition("PENDING", "COUNTERED")).toBe(true);
  });
  it("forbids re-accepting a rejected offer", () => {
    expect(offerMachine.canTransition("REJECTED", "ACCEPTED")).toBe(false);
  });
});

describe("disputeMachine", () => {
  it("walks OPEN -> NEEDS_SELLER_RESPONSE -> UNDER_REVIEW -> RESOLVED", () => {
    expect(disputeMachine.canTransition("OPEN", "NEEDS_SELLER_RESPONSE")).toBe(true);
    expect(disputeMachine.canTransition("NEEDS_SELLER_RESPONSE", "UNDER_REVIEW")).toBe(true);
    expect(disputeMachine.canTransition("UNDER_REVIEW", "RESOLVED_BUYER")).toBe(true);
  });
});
