import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireAdmin } from "@/lib/authz";
import { enforceRateLimit } from "@/lib/rate-limit";
import { adminListingActionSchema } from "@/lib/validation";
import { approveListing } from "@/lib/services/admin";

export const POST = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    await enforceRateLimit("adminSensitive", admin.id);
    const { id } = await params;
    const body = adminListingActionSchema.parse(await req.json().catch(() => ({})));
    return ok(await approveListing(admin.id, id, body.reason));
  },
);
