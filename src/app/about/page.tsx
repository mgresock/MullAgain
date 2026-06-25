export const metadata = { title: "About — MullAgain" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold text-ink">About MullAgain</h1>
      <p className="mt-4 text-muted">
        A “mulligan” is golf’s do-over — and MullAgain gives great golf gear a second life. We’re a
        peer-to-peer marketplace where golfers buy and sell used clubs, bags, rangefinders, apparel,
        shoes, balls, and accessories with confidence.
      </p>
      <div className="mt-8 space-y-6">
        <section>
          <h2 className="text-lg font-bold text-ink">Built on trust</h2>
          <p className="mt-1 text-muted">
            Sellers verify their identity and payout eligibility through Stripe before they can be
            paid. Listings from new or high-value sellers are reviewed before going live. Every order
            is covered by buyer protection until you confirm delivery.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-ink">Secure by design</h2>
          <p className="mt-1 text-muted">
            Payments run through Stripe; we never touch your card details. Funds are only released to
            sellers after they ship and you receive your gear. Disputes are reviewed by a human.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-ink">Fair fees</h2>
          <p className="mt-1 text-muted">
            We charge sellers a small platform fee on each sale to keep the lights on and fund buyer
            protection. No listing fees.
          </p>
        </section>
      </div>
    </div>
  );
}
