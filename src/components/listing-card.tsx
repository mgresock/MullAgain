import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { formatCents } from "@/lib/money";
import { CONDITION_LABELS } from "@/lib/display";
import { Badge } from "./ui/primitives";
import type { ListingCondition } from "@prisma/client";

export interface ListingCardData {
  slug: string;
  title: string;
  brand: string;
  priceCents: number;
  originalPriceCents?: number | null;
  condition: ListingCondition;
  imageUrl?: string | null;
  sellerName?: string | null;
  sellerVerified?: boolean;
  locationState?: string | null;
}

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const discount =
    listing.originalPriceCents && listing.originalPriceCents > listing.priceCents
      ? Math.round((1 - listing.priceCents / listing.originalPriceCents) * 100)
      : null;

  return (
    <Link
      href={`/marketplace/${listing.slug}`}
      className="group block overflow-hidden rounded-xl border border-[var(--border)] bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-fairway-50">
        {listing.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-fairway-300">No photo</div>
        )}
        {discount && (
          <span className="absolute left-3 top-3 rounded-full bg-sand-500 px-2 py-0.5 text-xs font-semibold text-ink">
            -{discount}%
          </span>
        )}
      </div>
      <div className="space-y-1.5 p-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="font-medium uppercase tracking-wide">{listing.brand}</span>
          <Badge color="gray">{CONDITION_LABELS[listing.condition]}</Badge>
        </div>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink">{listing.title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-fairway-700">
            {formatCents(listing.priceCents)}
          </span>
          {listing.originalPriceCents && discount && (
            <span className="text-xs text-muted line-through">
              {formatCents(listing.originalPriceCents)}
            </span>
          )}
        </div>
        {listing.sellerName && (
          <div className="flex items-center gap-1 text-xs text-muted">
            {listing.sellerVerified && <ShieldCheck className="h-3.5 w-3.5 text-fairway-600" />}
            <span>{listing.sellerName}</span>
            {listing.locationState && <span>· {listing.locationState}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
