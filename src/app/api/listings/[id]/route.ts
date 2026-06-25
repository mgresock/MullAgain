import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireActiveSeller, Errors } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { listingUpdateSchema } from "@/lib/validation";
import { updateListing, removeOwnListing } from "@/lib/services/seller-listings";

/** Public: fetch a listing by id or slug. */
export const GET = route(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const listing = await prisma.listing.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        images: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } },
        golfSpecs: true,
        seller: { select: { name: true, username: true, sellerProfile: true } },
      },
    });
    if (!listing) throw Errors.notFound("Listing not found.");
    return ok(listing);
  },
);

export const PATCH = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireActiveSeller();
    const { id } = await params;
    const body = listingUpdateSchema.parse(await req.json());
    const updated = await updateListing(user.id, user.sellerProfile, id, body);
    return ok({ id: updated.id, status: updated.status });
  },
);

export const DELETE = route(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireActiveSeller();
    const { id } = await params;
    return ok(await removeOwnListing(user.id, id));
  },
);
