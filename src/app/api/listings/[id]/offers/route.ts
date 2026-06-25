import { NextRequest } from "next/server";
import { created, route } from "@/lib/api";
import { requireVerifiedEmail } from "@/lib/authz";
import { enforceRateLimit } from "@/lib/rate-limit";
import { offerCreateSchema } from "@/lib/validation";
import { createOffer } from "@/lib/services/offers";

export const POST = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedEmail();
    await enforceRateLimit("offerCreate", user.id);

    const { id } = await params;
    const body = offerCreateSchema.parse(await req.json());
    const offer = await createOffer({
      buyerId: user.id,
      listingId: id,
      amountCents: body.amountCents,
      message: body.message,
    });
    return created({ id: offer.id, status: offer.status });
  },
);
