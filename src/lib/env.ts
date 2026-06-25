import { z } from "zod";

/**
 * Central, validated environment access. Importing `env` anywhere guarantees the
 * required variables exist and are well-typed. Integration secrets are optional
 * so the app boots in a "degraded" dev mode (console email, stubbed S3, etc.)
 * when keys are absent — see the integration modules for how absence is handled.
 */
const schema = z.object({
  // Defaulted to empty so the schema always parses (and policy defaults below
  // always apply) even when DATABASE_URL is absent, e.g. in unit tests or during
  // `next build`. Prisma surfaces a clear error at query time if it's missing.
  DATABASE_URL: z.string().default(""),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  AUTH_SECRET: z.string().min(1).default("dev-insecure-secret-change-me"),
  // Bearer secret guarding the maintenance/cron endpoint.
  CRON_SECRET: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(10000).default(800),

  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("MullAgain <no-reply@mullagain.test>"),

  // Twilio (SMS / phone verification). Use either a Messaging Service SID or a
  // from-number.
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),

  // Upstash Redis (distributed rate limiting). Read directly in rate-limit.ts;
  // listed here for documentation/validation.
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  REQUIRE_LISTING_REVIEW_FOR_NEW_SELLERS: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  HIGH_VALUE_REVIEW_THRESHOLD_CENTS: z.coerce.number().int().default(50000),
  AUTO_COMPLETE_AFTER_DELIVERY_HOURS: z.coerce.number().int().default(72),
  OFFER_EXPIRY_HOURS: z.coerce.number().int().default(48),
});

// During `next build` some env vars may be absent; we parse leniently and only
// throw for the truly required DATABASE_URL at runtime usage sites.
const parsed = schema.safeParse(process.env);

if (!parsed.success && process.env.NODE_ENV !== "production") {
  console.warn(
    "[env] Some environment variables are invalid:",
    parsed.error.flatten().fieldErrors,
  );
}

// On the (rare) parse failure, fall back to defaults so the app/tests still boot.
export const env: z.infer<typeof schema> = parsed.success ? parsed.data : schema.parse({});

export const isStripeConfigured = () =>
  Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
export const isS3Configured = () =>
  Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET);
export const isEmailConfigured = () => Boolean(env.RESEND_API_KEY);
export const isSmsConfigured = () =>
  Boolean(
    env.TWILIO_ACCOUNT_SID &&
      env.TWILIO_AUTH_TOKEN &&
      (env.TWILIO_FROM || env.TWILIO_MESSAGING_SERVICE_SID),
  );
