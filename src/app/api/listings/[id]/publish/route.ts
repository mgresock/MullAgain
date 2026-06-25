import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireActiveSeller } from "@/lib/authz";
import { publishListing } from "@/lib/services/seller-listings";

export const POST = route(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireActiveSeller();
    const { id } = await params;
    const result = await publishListing(user.id, user.sellerProfile, id);
    return ok(result);
  },
);
