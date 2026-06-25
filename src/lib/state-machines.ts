import {
  DisputeStatus,
  ListingStatus,
  OfferStatus,
  OrderStatus,
  ShipmentStatus,
} from "@prisma/client";

/**
 * Explicit state machines for every stateful marketplace entity. Mutations must
 * call `assertTransition` (or check `canTransition`) before writing a new state.
 * This keeps illegal jumps (e.g. SOLD -> DRAFT, DELIVERED -> AWAITING_PAYMENT)
 * out of the database regardless of which route triggered the change.
 */

export class IllegalTransitionError extends Error {
  constructor(entity: string, from: string, to: string) {
    super(`Illegal ${entity} transition: ${from} -> ${to}`);
    this.name = "IllegalTransitionError";
  }
}

function makeMachine<S extends string>(entity: string, graph: Record<S, S[]>) {
  return {
    canTransition(from: S, to: S): boolean {
      if (from === to) return true;
      return graph[from]?.includes(to) ?? false;
    },
    assertTransition(from: S, to: S): void {
      if (!this.canTransition(from, to)) {
        throw new IllegalTransitionError(entity, from, to);
      }
    },
    next(from: S): S[] {
      return graph[from] ?? [];
    },
  };
}

export const listingMachine = makeMachine<ListingStatus>("listing", {
  DRAFT: ["PENDING_REVIEW", "ACTIVE", "REMOVED"],
  PENDING_REVIEW: ["ACTIVE", "REJECTED", "REMOVED"],
  ACTIVE: ["RESERVED", "REMOVED", "EXPIRED", "PENDING_REVIEW"],
  RESERVED: ["ACTIVE", "SOLD", "REMOVED"],
  SOLD: ["REMOVED"],
  REJECTED: ["DRAFT", "PENDING_REVIEW", "REMOVED"],
  EXPIRED: ["ACTIVE", "DRAFT", "REMOVED"],
  REMOVED: [],
});

export const orderMachine = makeMachine<OrderStatus>("order", {
  CREATED: ["AWAITING_PAYMENT", "CANCELLED"],
  AWAITING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["SELLER_TO_SHIP", "SHIPPED", "REFUNDED", "DISPUTED", "CANCELLED"],
  SELLER_TO_SHIP: ["SHIPPED", "REFUNDED", "DISPUTED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "DISPUTED", "REFUNDED"],
  DELIVERED: ["COMPLETED", "DISPUTED", "REFUNDED"],
  COMPLETED: ["DISPUTED", "REFUNDED"],
  DISPUTED: ["REFUNDED", "COMPLETED", "CANCELLED"],
  CANCELLED: [],
  REFUNDED: [],
});

export const offerMachine = makeMachine<OfferStatus>("offer", {
  PENDING: ["ACCEPTED", "REJECTED", "COUNTERED", "EXPIRED", "CANCELLED"],
  COUNTERED: ["ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
  ACCEPTED: ["EXPIRED", "CANCELLED"],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
});

export const disputeMachine = makeMachine<DisputeStatus>("dispute", {
  OPEN: ["NEEDS_SELLER_RESPONSE", "UNDER_REVIEW", "CLOSED"],
  NEEDS_SELLER_RESPONSE: ["NEEDS_BUYER_RESPONSE", "UNDER_REVIEW", "CLOSED"],
  NEEDS_BUYER_RESPONSE: ["NEEDS_SELLER_RESPONSE", "UNDER_REVIEW", "CLOSED"],
  UNDER_REVIEW: [
    "RESOLVED_BUYER",
    "RESOLVED_SELLER",
    "REFUNDED",
    "NEEDS_SELLER_RESPONSE",
    "NEEDS_BUYER_RESPONSE",
    "CLOSED",
  ],
  RESOLVED_BUYER: ["REFUNDED", "CLOSED"],
  RESOLVED_SELLER: ["CLOSED"],
  REFUNDED: ["CLOSED"],
  CLOSED: [],
});

export const shipmentMachine = makeMachine<ShipmentStatus>("shipment", {
  NOT_SHIPPED: ["LABEL_CREATED", "IN_TRANSIT"],
  LABEL_CREATED: ["IN_TRANSIT", "NOT_SHIPPED"],
  IN_TRANSIT: ["DELIVERED", "LOST", "RETURNED"],
  DELIVERED: ["RETURNED"],
  LOST: [],
  RETURNED: [],
});
