import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireVerifiedEmail, Errors } from "@/lib/authz";
import { createOnboardingLink } from "@/lib/integrations/stripe";

export const POST = route(async (_req: NextRequest) => {
  const user = await requireVerifiedEmail();
  const accountId = user.sellerProfile?.stripeConnectedAccountId;
  if (!accountId) throw Errors.badRequest("No Stripe account yet — create one first.");
  const url = await createOnboardingLink(accountId);
  return ok({ onboardingUrl: url });
});
