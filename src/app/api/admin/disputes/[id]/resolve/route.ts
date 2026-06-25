import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireAdmin } from "@/lib/authz";
import { enforceRateLimit } from "@/lib/rate-limit";
import { disputeResolveSchema } from "@/lib/validation";
import { resolveDispute } from "@/lib/services/disputes";

export const POST = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    await enforceRateLimit("adminSensitive", admin.id);
    const { id } = await params;
    const body = disputeResolveSchema.parse(await req.json());
    return ok(await resolveDispute(admin.id, id, body));
  },
);
