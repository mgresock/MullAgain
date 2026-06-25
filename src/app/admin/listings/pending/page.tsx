import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { Card } from "@/components/ui/primitives";
import { AdminReviewActions } from "@/components/admin-review-actions";
import { CATEGORY_LABELS } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function PendingListings() {
  const listings = await prisma.listing.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    include: {
      images: { where: { status: "ACTIVE" }, take: 1, orderBy: { sortOrder: "asc" } },
      seller: { select: { name: true, sellerProfile: { select: { sellerTier: true, totalSales: true } } } },
    },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-ink">Review queue</h1>
      <p className="mb-6 text-sm text-muted">{listings.length} listing(s) awaiting approval.</p>

      {listings.length === 0 ? (
        <Card className="p-10 text-center text-muted">Nothing to review. 🎉</Card>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <Card key={l.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-fairway-50">
                {l.images[0]?.publicUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.images[0].publicUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/marketplace/${l.slug}`} className="font-medium hover:underline">
                  {l.title}
                </Link>
                <p className="text-sm text-muted">
                  {CATEGORY_LABELS[l.category]} · {formatCents(l.priceCents)} · {l.seller.name} (
                  {l.seller.sellerProfile?.sellerTier}, {l.seller.sellerProfile?.totalSales ?? 0} sales)
                </p>
              </div>
              <AdminReviewActions listingId={l.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
