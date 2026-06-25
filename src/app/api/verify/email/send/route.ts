import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { ok, route } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailVerificationTemplate } from "@/lib/integrations/email";
import { env } from "@/lib/env";

/** (Re)send the email verification link to the current user. */
export const POST = route(async (_req: NextRequest) => {
  const user = await requireUser();
  if (user.emailVerified) return ok({ alreadyVerified: true });
  await enforceRateLimit("emailVerify", user.id);

  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { userId: user.id, token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });

  const link = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  await sendEmail({ to: user.email, ...emailVerificationTemplate(link) });
  return ok({ sent: true });
});
