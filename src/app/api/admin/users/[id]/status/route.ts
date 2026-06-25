import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireAdmin } from "@/lib/authz";
import { enforceRateLimit } from "@/lib/rate-limit";
import { adminUserStatusSchema } from "@/lib/validation";
import { setUserStatus } from "@/lib/services/admin";

export const PATCH = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    await enforceRateLimit("adminSensitive", admin.id);
    const { id } = await params;
    const body = adminUserStatusSchema.parse(await req.json());
    const updated = await setUserStatus(admin.id, id, body.accountStatus, body.reason);
    return ok({ id: updated.id, accountStatus: updated.accountStatus });
  },
);
