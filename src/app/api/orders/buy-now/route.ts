import { NextRequest } from "next/server";
import { created, requestMeta, route } from "@/lib/api";
import { requireVerifiedEmail } from "@/lib/authz";
import { enforceRateLimit } from "@/lib/rate-limit";
import { buyNowSchema } from "@/lib/validation";
import { createBuyNowOrder } from "@/lib/services/orders";

/**
 * Create a buy-now order (status AWAITING_PAYMENT, listing reserved). The order
 * is NOT paid here — the client then calls /api/checkout/create-session.
 */
export const POST = route(async (req: NextRequest) => {
  const user = await requireVerifiedEmail();
  await enforceRateLimit("checkout", user.id);

  const { listingId } = buyNowSchema.parse(await req.json());
  const { order } = await createBuyNowOrder({ buyerId: user.id, listingId });

  return created({ orderId: order.id });
});
