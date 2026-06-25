import { NextRequest } from "next/server";
import { created, ok, route } from "@/lib/api";
import { requireActiveSeller } from "@/lib/authz";
import { enforceRateLimit } from "@/lib/rate-limit";
import { listingCreateSchema, searchSchema } from "@/lib/validation";
import { createListing } from "@/lib/services/seller-listings";
import { searchListings } from "@/lib/services/listings";

/** Public search/list endpoint. */
export const GET = route(async (req: NextRequest) => {
  const params = searchSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return ok(await searchListings(params));
});

/** Create a listing (seller only). */
export const POST = route(async (req: NextRequest) => {
  const user = await requireActiveSeller();
  await enforceRateLimit("listingCreate", user.id);

  const input = listingCreateSchema.parse(await req.json());
  const listing = await createListing(user.id, user.sellerProfile, input);
  return created({ id: listing.id, slug: listing.slug, status: listing.status });
});
