import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireVerifiedEmail, Errors } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createConnectedAccount, createOnboardingLink } from "@/lib/integrations/stripe";
import { audit } from "@/lib/audit";

/**
 * Create (or reuse) the seller's Stripe connected account and return a hosted
 * onboarding link. We do NOT collect KYC ourselves — Stripe hosts onboarding.
 */
export const POST = route(async (_req: NextRequest) => {
  const user = await requireVerifiedEmail();
  const sp = user.sellerProfile;
  if (!sp) throw Errors.badRequest("Create a seller profile first.");

  let accountId = sp.stripeConnectedAccountId;
  if (!accountId) {
    accountId = await createConnectedAccount(user.email);
    await prisma.sellerProfile.update({
      where: { id: sp.id },
      data: { stripeConnectedAccountId: accountId },
    });
    await audit({
      actorUserId: user.id,
      action: "seller.stripe_account_created",
      entityType: "SellerProfile",
      entityId: sp.id,
      metadata: { accountId },
    });
  }

  const url = await createOnboardingLink(accountId);
  return ok({ accountId, onboardingUrl: url });
});
