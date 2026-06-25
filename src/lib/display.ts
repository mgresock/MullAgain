import type { ListingCondition, ListingStatus, OrderStatus } from "@prisma/client";

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  NEW: "New",
  LIKE_NEW: "Like new",
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  FOR_PARTS: "For parts",
};

export const CATEGORY_LABELS: Record<string, string> = {
  DRIVERS: "Drivers",
  FAIRWAY_WOODS: "Fairway woods",
  HYBRIDS: "Hybrids",
  IRONS: "Irons",
  WEDGES: "Wedges",
  PUTTERS: "Putters",
  COMPLETE_SETS: "Complete sets",
  BAGS: "Bags",
  RANGEFINDERS: "Rangefinders",
  APPAREL: "Apparel",
  SHOES: "Shoes",
  BALLS: "Balls",
  ACCESSORIES: "Accessories",
  TRAINING_AIDS: "Training aids",
  OTHER: "Other",
};

export function listingStatusBadge(status: ListingStatus): {
  label: string;
  color: "green" | "gray" | "amber" | "red" | "blue";
} {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", color: "green" };
    case "PENDING_REVIEW":
      return { label: "Pending review", color: "amber" };
    case "RESERVED":
      return { label: "Reserved", color: "blue" };
    case "SOLD":
      return { label: "Sold", color: "gray" };
    case "REJECTED":
      return { label: "Rejected", color: "red" };
    case "REMOVED":
      return { label: "Removed", color: "red" };
    case "EXPIRED":
      return { label: "Expired", color: "gray" };
    default:
      return { label: "Draft", color: "gray" };
  }
}

export const ORDER_STATUS_STEPS: OrderStatus[] = [
  "AWAITING_PAYMENT",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
];

export function orderStatusLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    CREATED: "Created",
    AWAITING_PAYMENT: "Awaiting payment",
    PAID: "Paid — preparing to ship",
    SELLER_TO_SHIP: "Seller to ship",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
    DISPUTED: "Disputed",
  };
  return map[status];
}
