import Link from "next/link";
import { ShieldCheck, BadgeCheck, Truck, Scale } from "lucide-react";
import { searchListings } from "@/lib/services/listings";
import { ListingCard } from "@/components/listing-card";
import { CATEGORY_LABELS } from "@/lib/display";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const FEATURED_CATEGORIES = [
  "DRIVERS",
  "IRONS",
  "PUTTERS",
  "WEDGES",
  "BAGS",
  "RANGEFINDERS",
] as const;

export default async function HomePage() {
  const { items } = await searchListings({
    sort: "newest",
    page: 1,
    pageSize: 8,
  } as never);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-fairway-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-fairway-100 px-3 py-1 text-sm font-medium text-fairway-800">
              <ShieldCheck className="h-4 w-4" /> Buyer protection on every order
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              The trusted marketplace for{" "}
              <span className="text-fairway-600">second-hand golf gear</span>.
            </h1>
            <p className="mt-4 text-lg text-muted">
              Buy and sell used clubs, bags, rangefinders, apparel and more — with verified sellers,
              secure Stripe payments, and protection if something goes wrong.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/marketplace">
                <Button size="lg">Browse the marketplace</Button>
              </Link>
              <Link href="/sell">
                <Button size="lg" variant="outline">
                  Start selling
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="grid gap-4 rounded-2xl border border-[var(--border)] bg-white p-6 sm:grid-cols-4">
          {[
            { icon: ShieldCheck, t: "Buyer protection", d: "Covered until you confirm delivery." },
            { icon: BadgeCheck, t: "Verified sellers", d: "Stripe identity & payout checks." },
            { icon: Truck, t: "Tracked shipping", d: "Every order gets a tracking number." },
            { icon: Scale, t: "Fair disputes", d: "Human-reviewed resolution process." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-fairway-100 text-fairway-700">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-ink">{t}</p>
                <p className="text-sm text-muted">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-4 text-xl font-bold text-ink">Shop by category</h2>
        <div className="flex flex-wrap gap-2">
          {FEATURED_CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/marketplace?category=${c}`}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:border-fairway-400 hover:bg-fairway-50"
            >
              {CATEGORY_LABELS[c]}
            </Link>
          ))}
        </div>
      </section>

      {/* Latest listings */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">Fresh on the tee</h2>
          <Link href="/marketplace" className="text-sm font-medium text-fairway-700 hover:underline">
            View all →
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-muted">
            No listings yet. Run the seed script to populate demo gear.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((l) => (
              <ListingCard key={l.slug} listing={l} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
