import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, MapPin, Truck } from "lucide-react";
import { getListingBySlug } from "@/lib/services/listings";
import { getCurrentUser } from "@/lib/authz";
import { formatCents } from "@/lib/money";
import { CONDITION_LABELS, CATEGORY_LABELS } from "@/lib/display";
import { Badge } from "@/components/ui/primitives";
import { BuyBox } from "@/components/buy-box";
import { WatchButton } from "@/components/watch-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [listing, user] = await Promise.all([getListingBySlug(slug), getCurrentUser()]);
  if (!listing) notFound();

  // Increment view count (best-effort, fire-and-forget).
  void prisma.listing.update({ where: { id: listing.id }, data: { viewsCount: { increment: 1 } } }).catch(() => {});

  const specs = listing.golfSpecs;
  const sp = listing.seller.sellerProfile;
  const isOwner = user?.id === listing.sellerId;

  const watching = user
    ? Boolean(
        await prisma.watchlistItem.findUnique({
          where: { userId_listingId: { userId: user.id, listingId: listing.id } },
        }),
      )
    : false;

  const specRows: [string, string | null | undefined][] = [
    ["Club type", specs?.clubType],
    ["Handedness", specs?.handedness],
    ["Shaft flex", specs?.shaftFlex],
    ["Shaft material", specs?.shaftMaterial],
    ["Loft", specs?.loft],
    ["Length", specs?.length],
    ["Lie angle", specs?.lieAngle],
    ["Set composition", specs?.setComposition],
    ["Grip condition", specs?.gripCondition],
    ["Size", specs?.size],
    ["Headcover", specs?.headcoverIncluded ? "Included" : null],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 text-sm text-muted">
        <Link href="/marketplace" className="hover:text-fairway-700">
          Marketplace
        </Link>{" "}
        / <Link href={`/marketplace?category=${listing.category}`} className="hover:text-fairway-700">
          {CATEGORY_LABELS[listing.category]}
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        {/* Gallery */}
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border border-[var(--border)] bg-fairway-50">
            {listing.images[0]?.publicUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.images[0].publicUrl} alt={listing.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-fairway-300">No photo</div>
            )}
          </div>
          {listing.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {listing.images.slice(1, 6).map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.publicUrl ?? ""}
                  alt={img.altText ?? ""}
                  className="aspect-square w-full rounded-lg border object-cover"
                />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="font-semibold uppercase tracking-wide text-fairway-700">
                {listing.brand}
              </span>
              <Badge color="gray">{CONDITION_LABELS[listing.condition]}</Badge>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-ink">{listing.title}</h1>
            <p className="mt-2 text-3xl font-bold text-fairway-700">
              {formatCents(listing.priceCents)}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Truck className="h-4 w-4" />
              {listing.shippingType === "LOCAL_PICKUP"
                ? "Local pickup"
                : listing.shippingPriceCents > 0
                  ? `+ ${formatCents(listing.shippingPriceCents)} shipping`
                  : "Free shipping"}
            </span>
            {listing.locationState && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {listing.locationCity ? `${listing.locationCity}, ` : ""}
                {listing.locationState}
              </span>
            )}
          </div>

          <BuyBox
            listingId={listing.id}
            priceCents={listing.priceCents}
            allowOffers={listing.allowOffers}
            minOfferCents={listing.minOfferCents}
            isOwner={isOwner}
            isAuthed={Boolean(user)}
            isActive={listing.status === "ACTIVE"}
          />

          {!isOwner && (
            <WatchButton
              listingId={listing.id}
              initialWatching={watching}
              isAuthed={Boolean(user)}
            />
          )}

          <div className="rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-2">
              {sp && sp.sellerTier !== "NEW" && <ShieldCheck className="h-5 w-5 text-fairway-600" />}
              <div>
                <p className="font-semibold text-ink">
                  {sp?.displayName ?? listing.seller.name ?? "Seller"}
                </p>
                <p className="text-xs text-muted">
                  {sp?.totalSales ?? 0} sales · {sp?.sellerTier.replace("_", " ").toLowerCase()}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-fairway-700">
              Protected by MullAgain buyer protection until you confirm delivery.
            </p>
          </div>
        </div>
      </div>

      {/* Description + specs */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 className="mb-2 text-lg font-bold text-ink">Description</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
            {listing.description}
          </p>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-bold text-ink">Specifications</h2>
          <dl className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            {specRows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between px-4 py-2 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium text-ink">{String(v).replace(/_/g, " ")}</dd>
                </div>
              ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
