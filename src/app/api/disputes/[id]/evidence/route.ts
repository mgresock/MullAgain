import { NextRequest } from "next/server";
import { created, route } from "@/lib/api";
import { requireVerifiedEmail } from "@/lib/authz";
import { disputeEvidenceSchema } from "@/lib/validation";
import { addEvidence } from "@/lib/services/disputes";

export const POST = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedEmail();
    const { id } = await params;
    const body = disputeEvidenceSchema.parse(await req.json());
    const evidence = await addEvidence(user.id, id, body);
    return created({ id: evidence.id });
  },
);
