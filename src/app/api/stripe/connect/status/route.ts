import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireVerifiedEmail, Errors } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getConnectStatus } from "@/lib/integrations/stripe";

/**
 * Pull the live onboarding status from Stripe and sync it onto the seller
 * profile. Source of truth for whether a seller may publish/sell.
 */
export const GET = route(async (_req: NextRequest) => {
  const user = await requireVerifiedEmail();
  const sp = user.sellerProfile;
  if (!sp?.stripeConnectedAccountId) {
    throw Errors.badRequest("No connected account yet.");
  }

  const status = await getConnectStatus(sp.stripeConnectedAccountId);
  const onboardingComplete = status.chargesEnabled && status.payoutsEnabled;

  const updated = await prisma.sellerProfile.update({
    where: { id: sp.id },
    data: {
      stripeChargesEnabled: status.chargesEnabled,
      stripePayoutsEnabled: status.payoutsEnabled,
      stripeDetailsSubmitted: status.detailsSubmitted,
      onboardingComplete,
      sellerTier: onboardingComplete && sp.sellerTier === "NEW" ? "VERIFIED" : sp.sellerTier,
    },
  });

  if (onboardingComplete) {
    await prisma.userVerification.updateMany({
      where: { userId: user.id },
      data: { sellerStatus: "ACTIVE" },
    });
  }

  return ok({
    onboardingComplete,
    chargesEnabled: status.chargesEnabled,
    payoutsEnabled: status.payoutsEnabled,
    detailsSubmitted: status.detailsSubmitted,
    currentlyDue: status.currentlyDue,
    disabledReason: status.disabledReason,
    sellerTier: updated.sellerTier,
  });
});
