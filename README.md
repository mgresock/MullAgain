# MullAgain ⛳ — a second-sale golf gear marketplace

MullAgain is a production-architecture marketplace ("eBay for golf gear") for buying and selling
used clubs, bags, rangefinders, apparel, balls, shoes, and accessories. The emphasis is on a
**correct, trustworthy backend**: real auth, seller verification via Stripe Connect, webhook-driven
payments, explicit state machines, database transactions, audit logging, and server-side
authorization on every mutation.

> **Status:** Feature-complete against the original spec's API (§13) and pages (§15). Implemented
> and building/type-checking/tested: full schema, auth + email/phone verification, profile +
> addresses, seller onboarding (Stripe Connect), listings CRUD + image uploads + publish/review,
> offers, watchlist, buy-now + Checkout + idempotent webhooks, shipping, reviews, messaging (with
> off-platform-payment blocking), disputes + evidence + admin resolution, reports, the full admin
> console (overview, review queue, users, sellers, orders, disputes, reports, audit logs), scheduled
> maintenance (auto-complete + offer/order expiry), and notifications. See "Remaining" for the few
> items still stubbed (SMS provider, EasyPost/Shippo labels, tax, real FTS, Redis rate limiting).

---

## Stack

| Concern        | Choice                                                            |
| -------------- | ---------------------------------------------------------------- |
| Framework      | Next.js 15 (App Router) + React 19 + TypeScript                  |
| Styling        | Tailwind CSS v4, hand-rolled shadcn-style primitives             |
| Database       | PostgreSQL + Prisma ORM                                          |
| Auth           | Auth.js (NextAuth v5), Credentials + JWT sessions               |
| Payments       | Stripe Connect (Express accounts), Checkout, webhooks            |
| Storage        | AWS S3 via short-lived presigned PUT URLs                        |
| Email          | Resend (falls back to console logging when unconfigured)         |
| SMS / OTP      | Twilio REST (falls back to console logging when unconfigured)    |
| Rate limiting  | Upstash Redis sliding window (falls back to in-memory)           |
| Validation     | Zod on every mutating input                                      |
| Tests          | Vitest (unit). Playwright recommended for E2E (see next steps).  |

Integrations degrade gracefully: with no Stripe/S3/Resend keys the app still boots in a **dev-stub
mode** so you can exercise flows locally. Checkout itself requires real Stripe test keys.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
#   → set DATABASE_URL (Postgres) and AUTH_SECRET at minimum.
#     npx auth secret   # generates AUTH_SECRET

# 3. Create the schema and generate the client
npm run prisma:generate
npm run prisma:push        # or: npm run prisma:migrate

# 4. Seed demo users + listings
npm run db:seed

# 5. Run
npm run dev                # http://localhost:3000
```

Other scripts: `npm run typecheck`, `npm test`, `npm run build`, `npm run prisma:studio`.

### Seed accounts (password for all: `Password123!`)

| Email                       | Role / state                          |
| --------------------------- | ------------------------------------- |
| `admin@mullagain.test`      | **SUPER_ADMIN** — admin dashboard     |
| `seller@mullagain.test`     | Verified **TRUSTED** seller (8 listings) |
| `newseller@mullagain.test`  | **NEW** seller (listing limits apply) |
| `suspended@mullagain.test`  | Suspended account (blocked actions)   |
| `buyer@mullagain.test`      | Buyer with a default shipping address |

---

## Stripe setup (test mode)

1. Create a Stripe account and enable **Connect** (Dashboard → Connect → Get started).
2. Copy your test keys into `.env`:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
3. **Webhooks** — run the Stripe CLI locally:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   # copy the printed whsec_... into STRIPE_WEBHOOK_SECRET
   ```
   The webhook is the **only** thing that marks an order `PAID`. Handled events:
   `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`, `account.updated`.
4. Seller onboarding uses Stripe **hosted** onboarding (Account Links). In production, also add the
   webhook endpoint in the Dashboard and configure the same signing secret.

> Money is a **destination charge**: funds settle on the platform, `application_fee_amount` (the
> platform commission, default 8% — `PLATFORM_FEE_BPS`) is retained, and the remainder is
> transferred to the seller's connected account. All amounts are computed server-side in
> `src/lib/money.ts` from the order snapshot — never from the client.

---

## S3 setup (listing images)

1. Create a **private** bucket (e.g. `mullagain-listings`).
2. Add an IAM user/role with `s3:PutObject`, `s3:GetObject`, `s3:HeadObject`, `s3:DeleteObject` on
   `arn:aws:s3:::mullagain-listings/*`.
3. Fill `.env`: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`. Optionally
   set `S3_PUBLIC_BASE_URL` to a CloudFront distribution.
4. CORS on the bucket (so the browser can PUT directly):
   ```json
   [{ "AllowedMethods": ["PUT"], "AllowedOrigins": ["http://localhost:3000"],
      "AllowedHeaders": ["*"] }]
   ```

**Upload flow:** client → `POST /listings/:id/images/presign` (server validates type/size, **picks
the key** under `listings/<listingId>/<uuid>.<ext>` — users never choose keys) → browser `PUT`s to
S3 → `POST /listings/:id/images/confirm` (server `HEAD`s the object to confirm it exists, then emits
the public URL). Without AWS keys, presign returns a stub URL and confirm short-circuits to `true`
so the UI works in dev.

---

## Deploying to Vercel + Supabase

1. **Push to GitHub** (the repo is already initialized with a first commit):
   ```bash
   git remote add origin https://github.com/<you>/mullagain.git
   git push -u origin main
   ```
2. **Supabase** — create a project, then grab two connection strings from
   *Project Settings → Database*:
   - `DATABASE_URL` = the **Connection pooling** string (port `6543`); append
     `?pgbouncer=true&connection_limit=1`.
   - `DIRECT_URL` = the **direct** string (port `5432`) — used only for migrations.
   Apply the schema once from your machine:
   ```bash
   npm run prisma:deploy    # or: npm run prisma:push
   npm run db:seed          # optional demo data
   ```
3. **Vercel** — import the GitHub repo. Build command is the default
   (`prisma generate && next build`); `postinstall` also runs `prisma generate`.
   Add the environment variables below in *Project → Settings → Environment Variables*.
4. **Stripe webhook** — in the Stripe Dashboard add an endpoint at
   `https://<your-app>.vercel.app/api/webhooks/stripe`, subscribe to
   `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`,
   `account.updated`, and copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
5. **Cron** — [vercel.json](vercel.json) already registers the 15-minute
   maintenance job. Set `CRON_SECRET` so the endpoint is protected.

### Environment variables (Vercel)

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | ✅ | Supabase pooled + direct strings |
| `AUTH_SECRET` | ✅ | `npx auth secret` |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://<your-app>.vercel.app` |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | for payments | test or live keys |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` | for image uploads | private bucket |
| `RESEND_API_KEY`, `EMAIL_FROM` | for email | else logs to console |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` *or* `TWILIO_MESSAGING_SERVICE_SID` | for SMS OTP | else logs to console |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | recommended | distributed rate limiting; else in-memory |
| `CRON_SECRET` | recommended | guards `/api/cron/maintenance` |

`GET /api/health` returns DB connectivity and which integrations are configured —
handy for a smoke test right after deploy.

## Backend architecture

```
src/
  auth.ts, auth.config.ts        NextAuth v5 (Credentials + JWT). auth.config is edge-safe.
  middleware.ts                  Coarse redirect gate (defense-in-depth only).
  lib/
    env.ts                       Zod-validated env + isStripeConfigured()/isS3Configured()/…
    prisma.ts                    Singleton client.
    authz.ts                     requireUser / requireVerifiedEmail / requireActiveSeller /
                                 requireAdmin — re-loads the user and RE-CHECKS live status.
    money.ts                     computeOrderMoney() — the single source of truth for fees/totals.
    state-machines.ts            listing / order / offer / dispute / shipment transition graphs.
    validation.ts                Zod schemas for every input.
    trust-safety.ts              keyword scan, off-platform solicitation, review decision, limits.
    rate-limit.ts                token-bucket limiter (swap for Upstash in prod).
    audit.ts, notifications.ts   audit-log + in-app/email notifications (tx-aware).
    integrations/                stripe.ts, s3.ts, email.ts (graceful stub fallbacks).
    services/                    orders, offers, seller-listings, disputes, admin, listings —
                                 the transactional business logic.
  app/api/**                     Route Handlers; thin wrappers over services via route()/ok()/fail().
  app/**                         Pages (marketplace, dashboard, seller, admin).
```

**Principles enforced**

- **Never trust the client.** Every Route Handler re-checks auth, ownership, role, and entity status
  server-side. `priceCents`, `sellerId`, `platformFeeCents`, `status` etc. are always derived
  server-side. Server Actions/handlers are treated as public endpoints.
- **State machines.** Illegal jumps (e.g. `SOLD → DRAFT`, `SHIPPED → PAID`) throw before any write.
- **Transactions.** Order creation + listing reservation, offer acceptance, mark-paid + mark-sold,
  shipping, and dispute resolution are atomic (`prisma.$transaction`) and write their audit row
  inside the same transaction.
- **Webhook-driven payments.** The browser redirect never marks an order paid; the signature-verified
  Stripe webhook does, and it's **idempotent** (every `event.id` is stored in `PaymentEvent` with a
  unique constraint; duplicates are acknowledged and skipped).
- **Audit everything.** Signup, verification, listing lifecycle, offers, orders, payments, shipments,
  disputes, and admin actions all write `AuditLog` (+ `AdminAction` for admin moves).

### Marketplace payment flow

```
Buyer clicks Buy Now
  → POST /api/orders/buy-now   (tx: re-validate ACTIVE + not own listing + seller payouts enabled;
                                snapshot money; listing ACTIVE→RESERVED; order=AWAITING_PAYMENT)
  → POST /api/checkout/create-session  (Stripe Checkout; amounts from the order snapshot)
  → Stripe hosted payment
  → checkout.session.completed / payment_intent.succeeded  (webhook, signature-verified, idempotent)
       tx: order AWAITING_PAYMENT→PAID, listing RESERVED→SOLD, notify seller
  → Seller: POST /api/orders/:id/ship   (PAID→SHIPPED + Shipment + tracking, notify buyer)
  → Buyer:  POST /api/orders/:id/confirm-delivery  (→COMPLETED, bump seller sales)
            (or an auto-complete job after AUTO_COMPLETE_AFTER_DELIVERY_HOURS)
```

Accepted **offers** reuse the same machinery: `acceptOffer` creates a reserved order at the offer
price via `createBuyNowOrder({ itemPriceCentsOverride })`.

### Seller verification flow

```
1. Email verified  (token, required before buying/messaging/offers/selling)
2. Phone verified  (required before selling)
3. SellerProfile created
4. Stripe connected account created  → hosted onboarding (Account Link)
5. GET /api/stripe/connect/status syncs charges_enabled / payouts_enabled /
   details_submitted / requirements onto SellerProfile; account.updated webhook keeps it fresh.
6. requireActiveSeller() gates publishing & order acceptance on:
   emailVerified + phoneVerified + connected account + onboardingComplete +
   payouts & charges enabled.
```

Trust controls: NEW sellers are limited (max 5 active listings, $500 max value); listings from new
sellers, high-value items (`HIGH_VALUE_REVIEW_THRESHOLD_CENTS`), thin listings (<3 photos), or
suspicious wording go to `PENDING_REVIEW` for admin approval; sellers with open disputes can't list;
suspended users are blocked from listing/buying/messaging at the `requireUser` layer.

---

## Tests

```bash
npm test
```

Unit tests cover the money math, all state-machine transition rules, and the trust/safety review
decision (`tests/*.test.ts`). See **Next steps** for the recommended integration/E2E coverage.

---

## Scheduled jobs

`runMaintenance()` ([src/lib/services/maintenance.ts](src/lib/services/maintenance.ts)) auto-completes
shipped/delivered orders past the delivery window, expires unpaid reserved orders (returning the
listing to `ACTIVE`), and expires stale offers. It's exposed at `POST|GET /api/cron/maintenance`,
guarded by `Authorization: Bearer $CRON_SECRET`, and wired to Vercel Cron every 15 min via
[vercel.json](vercel.json). Any job runner (Inngest, Trigger.dev, GitHub Actions) can hit the same
endpoint. Trigger it locally with:

```bash
curl -X POST localhost:3000/api/cron/maintenance   # CRON_SECRET optional in dev
```

## Known limitations & next steps

- **SMS, email, rate limiting** are wired and switch on automatically when their keys are present
  (Twilio, Resend, Upstash). With no keys they degrade to console logging / in-memory limiting so
  local dev still works — no code change needed to go to production, just add the env vars.
- **Search** uses Postgres `ILIKE` over a denormalized `searchText`. Add a real FTS `tsvector` index
  or Meilisearch/Algolia behind `services/listings.ts` (the call sites won't change).
- **Shipping labels** (EasyPost/Shippo) and **tax** are placeholders; manual tracking is implemented.
- **Tests**: 29 unit tests cover money math, all state machines, trust/safety, and category-specific
  listing validation. Add Vitest integration tests against a test DB (buy-now, webhook idempotency,
  "seller can't buy own listing", "unverified seller can't publish", "suspended user blocked",
  "admin approves listing", "dispute creation") and Playwright E2E flows
  (signup→verify→onboard→list; search→buy→checkout success; ship; dispute; admin resolve).
```
