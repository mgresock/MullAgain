import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { sendEmail, genericNotificationTemplate } from "./integrations/email";

type Db = PrismaClient | Prisma.TransactionClient;

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  linkUrl?: string;
  /** Also send a transactional email (best-effort, fire-and-forget). */
  email?: { to: string };
}

/**
 * Create an in-app notification and optionally send an email. The DB row is
 * written via the provided client so it can join a surrounding transaction;
 * the email send is deliberately fire-and-forget so mail outages never break
 * the core mutation.
 */
export async function notify(input: NotifyInput, db: Db = prisma) {
  const row = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl,
    },
  });

  if (input.email) {
    const tpl = genericNotificationTemplate(input.title, input.body ?? "", input.linkUrl);
    void sendEmail({ to: input.email.to, ...tpl }).catch((e) =>
      console.error("[notify] email failed:", e),
    );
  }

  return row;
}
