import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireVerifiedEmail, Errors } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { sellerProfileSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const PATCH = route(async (req: NextRequest) => {
  const user = await requireVerifiedEmail();
  if (!user.sellerProfile) throw Errors.badRequest("Create a seller profile first.");
  const body = sellerProfileSchema.partial().parse(await req.json());

  const updated = await prisma.sellerProfile.update({
    where: { id: user.sellerProfile.id },
    data: body,
  });
  await audit({ actorUserId: user.id, action: "seller.profile_updated", entityType: "SellerProfile", entityId: updated.id });
  return ok({ id: updated.id });
});
