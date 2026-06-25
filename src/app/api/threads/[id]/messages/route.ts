import { NextRequest } from "next/server";
import { created, ok, route } from "@/lib/api";
import { requireVerifiedEmail } from "@/lib/authz";
import { enforceRateLimit } from "@/lib/rate-limit";
import { messageSchema } from "@/lib/validation";
import { getThreadMessages, postMessage } from "@/lib/services/messages";

export const GET = route(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedEmail();
    const { id } = await params;
    return ok(await getThreadMessages(user.id, id));
  },
);

export const POST = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedEmail();
    await enforceRateLimit("message", user.id);
    const { id } = await params;
    const body = messageSchema.parse(await req.json());
    const message = await postMessage(user.id, id, body.body);
    return created({ id: message.id });
  },
);
