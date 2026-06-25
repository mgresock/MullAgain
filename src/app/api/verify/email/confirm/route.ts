import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, route } from "@/lib/api";
import { Errors } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({ token: z.string().min(10) });

/** Confirm an email verification token. */
export const POST = route(async (req: NextRequest) => {
  const { token } = schema.parse(await req.json());

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.expires < new Date()) {
    throw Errors.badRequest("This verification link is invalid or expired.");
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: now } }),
    prisma.userVerification.upsert({
      where: { userId: record.userId },
      create: { userId: record.userId, emailVerifiedAt: now },
      update: { emailVerifiedAt: now },
    }),
    prisma.verificationToken.delete({ where: { id: record.id } }),
  ]);
  await audit({ actorUserId: record.userId, action: "user.email_verified", entityType: "User", entityId: record.userId });

  return ok({ verified: true });
});
