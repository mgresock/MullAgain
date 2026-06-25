import { NextRequest } from "next/server";
import { created, route } from "@/lib/api";
import { requireVerifiedEmail, Errors } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { sellerProfileSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const POST = route(async (req: NextRequest) => {
  const user = await requireVerifiedEmail();
  if (user.sellerProfile) throw Errors.conflict("Seller profile already exists.");

  const body = sellerProfileSchema.parse(await req.json());

  const profile = await prisma.$transaction(async (tx) => {
    const sp = await tx.sellerProfile.create({
      data: { userId: user.id, ...body },
    });
    await tx.userVerification.upsert({
      where: { userId: user.id },
      create: { userId: user.id, sellerStatus: "PENDING" },
      update: { sellerStatus: "PENDING" },
    });
    await audit(
      { actorUserId: user.id, action: "seller.profile_created", entityType: "SellerProfile", entityId: sp.id },
      tx,
    );
    return sp;
  });

  return created({ id: profile.id });
});
