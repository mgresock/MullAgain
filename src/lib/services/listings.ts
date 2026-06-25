import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { z } from "zod";
import type { searchSchema } from "../validation";

export type SearchParams = z.infer<typeof searchSchema>;

/**
 * Search/filter active listings. Uses Postgres full-text-ish matching on the
 * denormalized `searchText` column plus structured filters. Designed so a
 * dedicated search engine (Meilisearch/Algolia) can replace the `where`/`q`
 * branch later without changing callers.
 */
export async function searchListings(params: SearchParams) {
  const where: Prisma.ListingWhereInput = { status: "ACTIVE" };

  if (params.q && params.q.trim()) {
    const q = params.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
      { model: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { searchText: { contains: q, mode: "insensitive" } },
    ];
  }
  if (params.category) where.category = params.category;
  if (params.brand) where.brand = { equals: params.brand, mode: "insensitive" };
  if (params.condition) where.condition = params.condition;
  if (params.shippingType) where.shippingType = params.shippingType;
  if (params.minPriceCents != null || params.maxPriceCents != null) {
    where.priceCents = {
      ...(params.minPriceCents != null ? { gte: params.minPriceCents } : {}),
      ...(params.maxPriceCents != null ? { lte: params.maxPriceCents } : {}),
    };
  }
  if (params.handedness || params.shaftFlex || params.clubType) {
    where.golfSpecs = {
      ...(params.handedness ? { handedness: params.handedness } : {}),
      ...(params.shaftFlex ? { shaftFlex: params.shaftFlex } : {}),
      ...(params.clubType ? { clubType: params.clubType } : {}),
    };
  }

  const orderBy: Prisma.ListingOrderByWithRelationInput =
    params.sort === "oldest"
      ? { createdAt: "asc" }
      : params.sort === "price_asc"
        ? { priceCents: "asc" }
        : params.sort === "price_desc"
          ? { priceCents: "desc" }
          : { createdAt: "desc" };

  const skip = (params.page - 1) * params.pageSize;

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      skip,
      take: params.pageSize,
      include: {
        images: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" }, take: 1 },
        seller: {
          select: {
            name: true,
            username: true,
            sellerProfile: { select: { sellerTier: true, locationState: true } },
          },
        },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    items: items.map((l) => ({
      slug: l.slug,
      title: l.title,
      brand: l.brand,
      priceCents: l.priceCents,
      originalPriceCents: l.originalPriceCents,
      condition: l.condition,
      imageUrl: l.images[0]?.publicUrl ?? null,
      sellerName: l.seller.name ?? l.seller.username,
      sellerVerified: l.seller.sellerProfile?.sellerTier !== "NEW",
      locationState: l.locationState ?? l.seller.sellerProfile?.locationState ?? null,
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getListingBySlug(slug: string) {
  return prisma.listing.findUnique({
    where: { slug },
    include: {
      images: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } },
      golfSpecs: true,
      seller: {
        select: {
          id: true,
          name: true,
          username: true,
          createdAt: true,
          sellerProfile: true,
        },
      },
    },
  });
}

/** Build the denormalized search text for a listing on create/update. */
export function buildSearchText(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ").slice(0, 2000);
}
