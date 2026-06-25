import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { listingStatusBadge } from "@/lib/display";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ListingManageActions } from "@/components/listing-manage-actions";

export const dynamic = "force-dynamic";

export default async function SellerListingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/seller/listings");

  const listings = await prisma.listing.findMany({
    where: { sellerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { images: { where: { status: "ACTIVE" }, take: 1, orderBy: { sortOrder: "asc" } } },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Your listings</h1>
        <Link href="/seller/listings/new">
          <Button>New listing</Button>
        </Link>
      </div>
      {listings.length === 0 ? (
        <Card className="p-10 text-center text-muted">No listings yet.</Card>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => {
            const badge = listingStatusBadge(l.status);
            const canEdit = ["DRAFT", "ACTIVE", "REJECTED"].includes(l.status);
            return (
              <Card key={l.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-fairway-50">
                  {l.images[0]?.publicUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.images[0].publicUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/marketplace/${l.slug}`} className="truncate font-medium hover:underline">
                    {l.title}
                  </Link>
                  <p className="text-sm text-muted">
                    {formatCents(l.priceCents)} · {l.viewsCount} views · {l.watchCount} watching
                  </p>
                  {l.status === "REJECTED" && l.rejectionReason && (
                    <p className="text-xs text-red-600">Rejected: {l.rejectionReason}</p>
                  )}
                </div>
                <Badge color={badge.color}>{badge.label}</Badge>
                <ListingManageActions listingId={l.id} canEdit={canEdit} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
