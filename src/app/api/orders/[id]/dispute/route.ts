import { NextRequest } from "next/server";
import { created, route } from "@/lib/api";
import { requireVerifiedEmail } from "@/lib/authz";
import { disputeOpenSchema } from "@/lib/validation";
import { openDispute } from "@/lib/services/disputes";

export const POST = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedEmail();
    const { id } = await params;
    const body = disputeOpenSchema.parse(await req.json());
    const dispute = await openDispute(user.id, id, body);
    return created({ id: dispute.id, status: dispute.status });
  },
);
