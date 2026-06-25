import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validation";
import { created, requestMeta, route } from "@/lib/api";
import { Errors } from "@/lib/authz";
import { enforceRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { sendEmail, emailVerificationTemplate } from "@/lib/integrations/email";
import { env } from "@/lib/env";

export const POST = route(async (req: NextRequest) => {
  const meta = requestMeta(req);
  await enforceRateLimit("signup", meta.ipAddress ?? "anon");

  const body = signupSchema.parse(await req.json());

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw Errors.conflict("An account with that email already exists.");

  const passwordHash = await bcrypt.hash(body.password, 12);
  const token = randomBytes(32).toString("hex");

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
        verification: { create: {} },
        emailTokens: {
          create: { token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        },
      },
    });
    await audit(
      { actorUserId: u.id, action: "user.signup", entityType: "User", entityId: u.id, ...meta },
      tx,
    );
    return u;
  });

  const link = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  void sendEmail({ to: user.email, ...emailVerificationTemplate(link) }).catch(() => {});

  return created({ id: user.id, email: user.email });
});
