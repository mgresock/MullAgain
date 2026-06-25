import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { Card, CardBody, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { listingStatusBadge } from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function SellerDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/seller/dashboard");
  const sp = user.sellerProfile;
  if (!sp) redirect("/seller/onboarding");

  const [listings, orders, offers, grossAgg] = await Promise.all([
    prisma.listing.findMany({ where: { sellerId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.order.count({ where: { sellerId: user.id, status: { in: ["PAID", "SELLER_TO_SHIP"] } } }),
    prisma.offer.count({ where: { sellerId: user.id, status: "PENDING" } }),
    prisma.order.aggregate({
      where: { sellerId: user.id, status: { in: ["COMPLETED", "DELIVERED", "SHIPPED", "PAID"] } },
      _sum: { sellerProceedsCents: true },
    }),
  ]);

  const stats = [
    { label: "Lifetime sales", value: String(sp.totalSales) },
    { label: "Net earned", value: formatCents(grossAgg._sum.sellerProceedsCents ?? 0) },
    { label: "Orders to ship", value: String(orders) },
    { label: "Pending offers", value: String(offers) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{sp.displayName}</h1>
          <p className="text-sm text-muted">
            {sp.sellerTier.replace("_", " ")} seller · {sp.averageRating.toFixed(1)}★
          </p>
        </div>
        <Link href="/seller/listings/new">
          <Button>New listing</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardBody>
              <p className="text-sm text-muted">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-ink">{s.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex gap-3 text-sm">
        <Link href="/seller/orders" className="font-medium text-fairway-700 hover:underline">
          Orders →
        </Link>
        <Link href="/seller/offers" className="font-medium text-fairway-700 hover:underline">
          Offers →
        </Link>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-ink">Your listings</h2>
      <Card>
        <div className="divide-y divide-[var(--border)]">
          {listings.length === 0 && <p className="p-6 text-sm text-muted">No listings yet.</p>}
          {listings.map((l) => {
            const badge = listingStatusBadge(l.status);
            return (
              <div key={l.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <Link href={`/marketplace/${l.slug}`} className="truncate font-medium hover:underline">
                    {l.title}
                  </Link>
                  <p className="text-sm text-muted">{formatCents(l.priceCents)}</p>
                </div>
                <Badge color={badge.color}>{badge.label}</Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
