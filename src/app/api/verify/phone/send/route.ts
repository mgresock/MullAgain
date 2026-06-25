import { NextRequest } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ok, route } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/integrations/sms";

const schema = z.object({ phone: z.string().regex(/^\+?[0-9\-().\s]{7,20}$/) });

/** Send a 6-digit OTP to the user's phone. The code is stored hashed. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  await enforceRateLimit("phoneVerify", user.id);

  const { phone } = schema.parse(await req.json());
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 10);

  await prisma.$transaction([
    prisma.phoneOtp.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({ where: { id: user.id }, data: { phone } }),
    prisma.phoneOtp.create({
      data: { userId: user.id, codeHash, expires: new Date(Date.now() + 10 * 60_000) },
    }),
  ]);

  await sendSms(phone, `Your MullAgain verification code is ${code}. It expires in 10 minutes.`);
  return ok({ sent: true });
});
