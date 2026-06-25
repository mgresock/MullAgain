import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireActiveSeller } from "@/lib/authz";
import { acceptOffer } from "@/lib/services/offers";

export const POST = route(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireActiveSeller();
    const { id } = await params;
    return ok(await acceptOffer(user.id, id));
  },
);
