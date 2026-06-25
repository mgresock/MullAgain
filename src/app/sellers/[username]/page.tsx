import { notFound } from "next/navigation";
import { ShieldCheck, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/listing-card";

export const dynamic = "force-dynamic";

export default async function SellerStorefront({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const seller = await prisma.user.findUnique({
    where: { username },
    include: { sellerProfile: true },
  });
  if (!seller || !seller.sellerProfile) notFound();
  const sp = seller.sellerProfile;

  const listings = await prisma.listing.findMany({
    where: { sellerId: seller.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: { images: { where: { status: "ACTIVE" }, take: 1, orderBy: { sortOrder: "asc" } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--border)] bg-fairway-50 p-6">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-fairway-600 text-2xl font-bold text-white">
          {sp.displayName.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-ink">{sp.displayName}</h1>
            {sp.sellerTier !== "NEW" && <ShieldCheck className="h-5 w-5 text-fairway-600" />}
          </div>
          <p className="text-sm text-muted">
            {sp.sellerTier.replace("_", " ").toLowerCase()} ·{" "}
            <Star className="mb-0.5 inline h-3.5 w-3.5 text-sand-500" /> {sp.averageRating.toFixed(1)} (
            {sp.ratingCount}) · {sp.totalSales} sales
            {sp.locationState ? ` · ${sp.locationCity ?? ""} ${sp.locationState}` : ""}
          </p>
          {sp.bio && <p className="mt-2 max-w-2xl text-sm text-muted">{sp.bio}</p>}
        </div>
      </div>

      <h2 className="mb-4 mt-8 text-lg font-bold text-ink">
        {listings.length} active listing{listings.length === 1 ? "" : "s"}
      </h2>
      {listings.length === 0 ? (
        <p className="text-muted">This seller has no active listings right now.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={{
                slug: l.slug,
                title: l.title,
                brand: l.brand,
                priceCents: l.priceCents,
                originalPriceCents: l.originalPriceCents,
                condition: l.condition,
                imageUrl: l.images[0]?.publicUrl ?? null,
                sellerName: sp.displayName,
                sellerVerified: sp.sellerTier !== "NEW",
                locationState: l.locationState,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
