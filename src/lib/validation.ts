import { z } from "zod";
import {
  ClubType,
  Handedness,
  ListingCategory,
  ListingCondition,
  ShaftFlex,
  ShaftMaterial,
  ShippingType,
} from "@prisma/client";

/**
 * Zod schemas for every mutating input. Routes/actions must parse with these
 * before touching the database. Money is always integer cents.
 */

export const cuid = z.string().min(1).max(40);
export const priceCents = z.number().int().min(500).max(5_000_000); // $5 – $50,000

// ── Auth ────────────────────────────────────────────────────────────────────
export const signupSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(80),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

// ── Profile ───────────────────────────────────────────────────────────────
export const updateMeSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/, "lowercase letters, numbers, underscore only")
    .optional(),
  avatarUrl: z.string().url().optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9\-().\s]{7,20}$/)
    .optional(),
});

export const addressSchema = z.object({
  name: z.string().min(1).max(80),
  line1: z.string().min(1).max(120),
  line2: z.string().max(120).optional(),
  city: z.string().min(1).max(80),
  state: z.string().min(1).max(40),
  postalCode: z.string().min(3).max(12),
  country: z.string().length(2).default("US"),
  phone: z.string().max(20).optional(),
  isDefaultShipping: z.boolean().optional(),
  isDefaultReturn: z.boolean().optional(),
});

// ── Seller ────────────────────────────────────────────────────────────────
export const sellerProfileSchema = z.object({
  displayName: z.string().min(2).max(60),
  bio: z.string().max(1000).optional(),
  locationCity: z.string().max(80).optional(),
  locationState: z.string().max(40).optional(),
  returnPolicy: z.string().max(2000).optional(),
});

// ── Golf specs ──────────────────────────────────────────────────────────────
export const golfSpecsSchema = z.object({
  clubType: z.nativeEnum(ClubType).optional(),
  handedness: z.nativeEnum(Handedness).optional(),
  shaftFlex: z.nativeEnum(ShaftFlex).optional(),
  shaftMaterial: z.nativeEnum(ShaftMaterial).optional(),
  loft: z.string().max(40).optional(),
  length: z.string().max(40).optional(),
  lieAngle: z.string().max(40).optional(),
  setComposition: z.string().max(120).optional(),
  gripCondition: z.string().max(120).optional(),
  headcoverIncluded: z.boolean().optional(),
  size: z.string().max(40).optional(),
  notes: z.string().max(1000).optional(),
});

// ── Listings ──────────────────────────────────────────────────────────────
export const listingCreateSchema = z
  .object({
    title: z.string().min(8).max(100),
    description: z.string().min(40).max(3000),
    category: z.nativeEnum(ListingCategory),
    subcategory: z.string().max(60).optional(),
    brand: z.string().min(1).max(60),
    model: z.string().max(80).optional(),
    condition: z.nativeEnum(ListingCondition),
    priceCents,
    originalPriceCents: priceCents.optional(),
    quantity: z.number().int().min(1).max(50).default(1),
    allowOffers: z.boolean().default(true),
    minOfferCents: priceCents.optional(),
    shippingType: z.nativeEnum(ShippingType).default(ShippingType.SHIPPING),
    shippingPriceCents: z.number().int().min(0).max(100000).default(0),
    locationCity: z.string().max(80).optional(),
    locationState: z.string().max(40).optional(),
    golfSpecs: golfSpecsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    // Category-specific required specs (per spec §5).
    const s = data.golfSpecs;
    const requireSpec = (cond: boolean, field: string) => {
      if (!cond) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing required spec for ${data.category}: ${field}`,
          path: ["golfSpecs", field],
        });
      }
    };

    switch (data.category) {
      case ListingCategory.DRIVERS:
        requireSpec(!!s?.loft, "loft");
        requireSpec(!!s?.handedness, "handedness");
        requireSpec(!!s?.shaftFlex, "shaftFlex");
        break;
      case ListingCategory.IRONS:
        requireSpec(!!s?.setComposition, "setComposition");
        requireSpec(!!s?.shaftFlex, "shaftFlex");
        requireSpec(!!s?.shaftMaterial, "shaftMaterial");
        requireSpec(!!s?.handedness, "handedness");
        break;
      case ListingCategory.PUTTERS:
        requireSpec(!!s?.length, "length");
        requireSpec(!!s?.handedness, "handedness");
        break;
      case ListingCategory.APPAREL:
      case ListingCategory.SHOES:
        requireSpec(!!s?.size, "size");
        break;
    }

    if (data.minOfferCents && data.minOfferCents > data.priceCents) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum offer cannot exceed price.",
        path: ["minOfferCents"],
      });
    }
  });

export const listingUpdateSchema = z.object({
  title: z.string().min(8).max(100).optional(),
  description: z.string().min(40).max(3000).optional(),
  brand: z.string().min(1).max(60).optional(),
  model: z.string().max(80).optional(),
  condition: z.nativeEnum(ListingCondition).optional(),
  priceCents: priceCents.optional(),
  allowOffers: z.boolean().optional(),
  minOfferCents: priceCents.optional(),
  shippingType: z.nativeEnum(ShippingType).optional(),
  shippingPriceCents: z.number().int().min(0).max(100000).optional(),
  golfSpecs: golfSpecsSchema.optional(),
});

// ── Images ──────────────────────────────────────────────────────────────────
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MIN_IMAGES = 3;
export const MAX_IMAGES = 12;

export const presignSchema = z.object({
  files: z
    .array(
      z.object({
        contentType: z.enum(ALLOWED_IMAGE_TYPES),
        sizeBytes: z.number().int().min(1).max(MAX_IMAGE_BYTES),
      }),
    )
    .min(1)
    .max(MAX_IMAGES),
});

export const imageConfirmSchema = z.object({
  images: z
    .array(
      z.object({
        s3Key: z.string().min(1).max(300),
        altText: z.string().max(160).optional(),
        sortOrder: z.number().int().min(0).max(MAX_IMAGES).optional(),
      }),
    )
    .min(1)
    .max(MAX_IMAGES),
});

// ── Offers ──────────────────────────────────────────────────────────────────
export const offerCreateSchema = z.object({
  amountCents: priceCents,
  message: z.string().max(500).optional(),
});

export const offerCounterSchema = z.object({
  amountCents: priceCents,
  message: z.string().max(500).optional(),
});

// ── Orders / shipping ───────────────────────────────────────────────────────
export const buyNowSchema = z.object({
  listingId: cuid,
});

export const shipSchema = z.object({
  carrier: z.string().min(1).max(40),
  trackingNumber: z.string().min(3).max(60),
  trackingUrl: z.string().url().optional(),
});

// ── Messages ────────────────────────────────────────────────────────────────
export const startThreadSchema = z.object({
  listingId: cuid,
  body: z.string().min(1).max(2000),
});

export const messageSchema = z.object({
  body: z.string().min(1).max(2000),
});

// ── Reviews ─────────────────────────────────────────────────────────────────
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// ── Disputes ────────────────────────────────────────────────────────────────
export const disputeOpenSchema = z.object({
  reason: z.enum([
    "ITEM_NOT_RECEIVED",
    "ITEM_NOT_AS_DESCRIBED",
    "DAMAGED",
    "COUNTERFEIT",
    "WRONG_ITEM",
    "OTHER",
  ]),
  description: z.string().min(10).max(2000),
});

export const disputeEvidenceSchema = z.object({
  evidenceType: z.enum(["IMAGE", "TEXT", "TRACKING", "OTHER"]),
  content: z.string().max(2000).optional(),
  fileUrl: z.string().url().optional(),
});

export const disputeResolveSchema = z.object({
  outcome: z.enum([
    "RESOLVED_BUYER",
    "RESOLVED_SELLER",
    "REFUNDED",
    "NEEDS_SELLER_RESPONSE",
    "NEEDS_BUYER_RESPONSE",
    "CLOSED",
  ]),
  resolution: z.string().max(2000).optional(),
  adminNotes: z.string().max(2000).optional(),
  refundCents: z.number().int().min(0).optional(),
});

// ── Reports ─────────────────────────────────────────────────────────────────
export const reportSchema = z
  .object({
    reportedUserId: cuid.optional(),
    listingId: cuid.optional(),
    reason: z.string().min(1).max(80),
    description: z.string().max(1000).optional(),
  })
  .refine((d) => d.reportedUserId || d.listingId, {
    message: "Report must target a user or a listing.",
  });

// ── Admin ───────────────────────────────────────────────────────────────────
export const adminUserStatusSchema = z.object({
  accountStatus: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]),
  reason: z.string().max(500).optional(),
});

export const adminListingActionSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ── Search ──────────────────────────────────────────────────────────────────
export const searchSchema = z.object({
  q: z.string().max(120).optional(),
  category: z.nativeEnum(ListingCategory).optional(),
  brand: z.string().max(60).optional(),
  condition: z.nativeEnum(ListingCondition).optional(),
  minPriceCents: z.coerce.number().int().min(0).optional(),
  maxPriceCents: z.coerce.number().int().min(0).optional(),
  handedness: z.nativeEnum(Handedness).optional(),
  shaftFlex: z.nativeEnum(ShaftFlex).optional(),
  clubType: z.nativeEnum(ClubType).optional(),
  shippingType: z.nativeEnum(ShippingType).optional(),
  sort: z.enum(["newest", "oldest", "price_asc", "price_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
});
