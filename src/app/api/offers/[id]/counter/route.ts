import { NextRequest } from "next/server";
import { created, route } from "@/lib/api";
import { requireActiveSeller } from "@/lib/authz";
import { offerCounterSchema } from "@/lib/validation";
import { counterOffer } from "@/lib/services/offers";

export const POST = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireActiveSeller();
    const { id } = await params;
    const body = offerCounterSchema.parse(await req.json());
    const counter = await counterOffer(user.id, id, body.amountCents, body.message);
    return created({ id: counter.id, status: counter.status });
  },
);
