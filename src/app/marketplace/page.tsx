import Link from "next/link";
import { searchListings } from "@/lib/services/listings";
import { searchSchema } from "@/lib/validation";
import { ListingCard } from "@/components/listing-card";
import { CATEGORY_LABELS, CONDITION_LABELS } from "@/lib/display";
import { ListingCategory, ListingCondition } from "@prisma/client";

export const dynamic = "force-dynamic";

function buildQuery(base: Record<string, string | undefined>, override: Record<string, string | undefined>) {
  const merged = { ...base, ...override };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
  return `?${sp.toString()}`;
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = await searchParams;
  const params = searchSchema.parse(raw);
  const result = await searchListings(params);

  const sorts = [
    ["newest", "Newest"],
    ["price_asc", "Price: low → high"],
    ["price_desc", "Price: high → low"],
    ["oldest", "Oldest"],
  ] as const;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Marketplace</h1>
          <p className="text-sm text-muted">{result.total} items found</p>
        </div>
        <form className="flex items-center gap-2" action="/marketplace">
          {raw.category && <input type="hidden" name="category" value={raw.category} />}
          <input
            name="q"
            defaultValue={raw.q ?? ""}
            placeholder="Search clubs, brands…"
            className="h-10 w-64 rounded-lg border border-[var(--border)] px-3 text-sm outline-none focus:border-fairway-500"
          />
          <select
            name="sort"
            defaultValue={params.sort}
            className="h-10 rounded-lg border border-[var(--border)] px-2 text-sm"
          >
            {sorts.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <button className="h-10 rounded-lg bg-fairway-600 px-4 text-sm font-medium text-white">
            Search
          </button>
        </form>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Filters */}
        <aside className="space-y-6 text-sm">
          <div>
            <p className="mb-2 font-semibold text-ink">Category</p>
            <ul className="space-y-1">
              <li>
                <Link
                  href={buildQuery(raw, { category: undefined })}
                  className={!raw.category ? "font-semibold text-fairway-700" : "text-muted hover:text-ink"}
                >
                  All categories
                </Link>
              </li>
              {Object.values(ListingCategory).map((c) => (
                <li key={c}>
                  <Link
                    href={buildQuery(raw, { category: c })}
                    className={
                      raw.category === c ? "font-semibold text-fairway-700" : "text-muted hover:text-ink"
                    }
                  >
                    {CATEGORY_LABELS[c]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 font-semibold text-ink">Condition</p>
            <ul className="space-y-1">
              {Object.values(ListingCondition).map((c) => (
                <li key={c}>
                  <Link
                    href={buildQuery(raw, { condition: raw.condition === c ? undefined : c })}
                    className={
                      raw.condition === c ? "font-semibold text-fairway-700" : "text-muted hover:text-ink"
                    }
                  >
                    {CONDITION_LABELS[c]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <form action="/marketplace" className="space-y-2">
            {raw.category && <input type="hidden" name="category" value={raw.category} />}
            {raw.q && <input type="hidden" name="q" value={raw.q} />}
            <p className="font-semibold text-ink">Price range ($)</p>
            <div className="flex items-center gap-2">
              <input
                name="minPriceCents"
                type="number"
                placeholder="Min"
                className="h-9 w-full rounded-md border px-2"
              />
              <span>–</span>
              <input
                name="maxPriceCents"
                type="number"
                placeholder="Max"
                className="h-9 w-full rounded-md border px-2"
              />
            </div>
            <p className="text-xs text-muted">Enter values in cents (e.g. 50000 = $500).</p>
            <button className="h-9 w-full rounded-md border border-fairway-600 text-sm font-medium text-fairway-700">
              Apply price
            </button>
          </form>
        </aside>

        {/* Results */}
        <div>
          {result.items.length === 0 ? (
            <div className="rounded-xl border border-dashed p-16 text-center text-muted">
              No listings match your filters.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {result.items.map((l) => (
                  <ListingCard key={l.slug} listing={l} />
                ))}
              </div>
              {result.totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  {Array.from({ length: result.totalPages }).map((_, i) => {
                    const page = String(i + 1);
                    const active = result.page === i + 1;
                    return (
                      <Link
                        key={page}
                        href={buildQuery(raw, { page })}
                        className={`grid h-9 w-9 place-items-center rounded-md border text-sm ${
                          active ? "bg-fairway-600 text-white" : "hover:bg-fairway-50"
                        }`}
                      >
                        {page}
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
