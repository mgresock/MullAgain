import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ok, route } from "@/lib/api";
import { requireUser, Errors } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({ code: z.string().length(6) });
const MAX_ATTEMPTS = 5;

/** Confirm the phone OTP. Limited attempts; success sets phoneVerified. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const { code } = schema.parse(await req.json());

  const otp = await prisma.phoneOtp.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.expires < new Date()) {
    throw Errors.badRequest("Your code has expired. Request a new one.");
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    throw Errors.badRequest("Too many attempts. Request a new code.");
  }

  const valid = await bcrypt.compare(code, otp.codeHash);
  if (!valid) {
    await prisma.phoneOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw Errors.badRequest("Incorrect code.");
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { phoneVerified: now } }),
    prisma.userVerification.upsert({
      where: { userId: user.id },
      create: { userId: user.id, phoneVerifiedAt: now },
      update: { phoneVerifiedAt: now },
    }),
    prisma.phoneOtp.deleteMany({ where: { userId: user.id } }),
  ]);
  await audit({ actorUserId: user.id, action: "user.phone_verified", entityType: "User", entityId: user.id });

  return ok({ verified: true });
});
