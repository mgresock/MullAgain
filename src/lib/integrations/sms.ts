import { env, isSmsConfigured } from "../env";

/**
 * SMS sending via the Twilio REST API (no SDK — a single authenticated POST so
 * the bundle stays lean and edge-friendly). When Twilio isn't configured, the
 * message is logged to the console so phone-verification flows stay testable in
 * local dev.
 *
 * Configure with TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN and either TWILIO_FROM
 * (a purchased number) or TWILIO_MESSAGING_SERVICE_SID.
 */
export async function sendSms(to: string, body: string): Promise<void> {
  if (!isSmsConfigured()) {
    console.info(`\n[sms:dev] To: ${to}\n[sms:dev] ${body}\n`);
    return;
  }

  const sid = env.TWILIO_ACCOUNT_SID!;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams({ To: to, Body: body });
  if (env.TWILIO_MESSAGING_SERVICE_SID) {
    params.set("MessagingServiceSid", env.TWILIO_MESSAGING_SERVICE_SID);
  } else {
    params.set("From", env.TWILIO_FROM!);
  }

  const auth = Buffer.from(`${sid}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Twilio send failed (${res.status}): ${detail.slice(0, 300)}`);
  }
}
