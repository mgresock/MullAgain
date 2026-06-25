import { NextRequest } from "next/server";
import { created, ok, route } from "@/lib/api";
import { requireVerifiedEmail } from "@/lib/authz";
import { enforceRateLimit } from "@/lib/rate-limit";
import { startThreadSchema } from "@/lib/validation";
import { listThreads, startThread } from "@/lib/services/messages";

export const GET = route(async () => {
  const user = await requireVerifiedEmail();
  return ok({ threads: await listThreads(user.id) });
});

export const POST = route(async (req: NextRequest) => {
  const user = await requireVerifiedEmail();
  await enforceRateLimit("message", user.id);
  const body = startThreadSchema.parse(await req.json());
  const thread = await startThread(user.id, body.listingId, body.body);
  return created({ id: thread.id });
});
