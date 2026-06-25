import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireVerifiedEmail } from "@/lib/authz";
import { cancelOffer } from "@/lib/services/offers";

export const POST = route(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedEmail();
    const { id } = await params;
    return ok(await cancelOffer(user.id, id));
  },
);
