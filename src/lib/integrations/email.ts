import { Resend } from "resend";
import { env, isEmailConfigured } from "../env";

/**
 * Transactional email. Uses Resend when configured; otherwise logs to the
 * console so dev flows (verification links, notifications) are observable
 * without an email provider.
 */

let resend: Resend | null = null;
function client(): Resend {
  if (!resend) resend = new Resend(env.RESEND_API_KEY);
  return resend;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!isEmailConfigured()) {
    console.info(
      `\n[email:dev] To: ${input.to}\n[email:dev] Subject: ${input.subject}\n[email:dev] ${input.text ?? stripHtml(input.html)}\n`,
    );
    return;
  }
  await client().emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function emailVerificationTemplate(link: string) {
  return {
    subject: "Verify your MullAgain email",
    html: `<h2>Welcome to MullAgain</h2><p>Confirm your email to start buying and selling golf gear.</p><p><a href="${link}">Verify my email</a></p><p>This link expires in 24 hours.</p>`,
  };
}

export function orderPaidSellerTemplate(orderId: string, itemTitle: string) {
  const link = `${env.NEXT_PUBLIC_APP_URL}/seller/orders`;
  return {
    subject: `You sold "${itemTitle}" — ship it now`,
    html: `<h2>Cha-ching!</h2><p>Your item <strong>${itemTitle}</strong> has sold. Add tracking and ship it to release your payout.</p><p><a href="${link}">View order ${orderId}</a></p>`,
  };
}

export function orderShippedBuyerTemplate(orderId: string, tracking: string) {
  const link = `${env.NEXT_PUBLIC_APP_URL}/dashboard/purchases`;
  return {
    subject: "Your MullAgain order has shipped",
    html: `<h2>On the way</h2><p>Tracking: <strong>${tracking}</strong></p><p><a href="${link}">Track order ${orderId}</a></p>`,
  };
}

export function genericNotificationTemplate(title: string, body: string, linkUrl?: string) {
  return {
    subject: title,
    html: `<h2>${title}</h2><p>${body}</p>${linkUrl ? `<p><a href="${linkUrl}">View</a></p>` : ""}`,
  };
}
