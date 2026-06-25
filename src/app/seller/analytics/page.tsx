import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { Card, CardBody } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function SellerAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/seller/analytics");
  const sp = user.sellerProfile;
  if (!sp) redirect("/seller/onboarding");

  const [grossPaid, completed, listingAgg, activeViews, conversion] = await Promise.all([
    prisma.order.aggregate({
      where: { sellerId: user.id, status: { in: ["PAID", "SHIPPED", "DELIVERED", "COMPLETED"] } },
      _sum: { sellerProceedsCents: true, totalCents: true },
      _count: true,
    }),
    prisma.order.count({ where: { sellerId: user.id, status: "COMPLETED" } }),
    prisma.listing.groupBy({ by: ["status"], where: { sellerId: user.id }, _count: true }),
    prisma.listing.aggregate({ where: { sellerId: user.id }, _sum: { viewsCount: true, watchCount: true } }),
    prisma.offer.count({ where: { sellerId: user.id } }),
  ]);

  const statusCounts = Object.fromEntries(listingAgg.map((s) => [s.status, s._count]));

  const stats = [
    { label: "Net earned (paid+)", value: formatCents(grossPaid._sum.sellerProceedsCents ?? 0) },
    { label: "Gross sales", value: formatCents(grossPaid._sum.totalCents ?? 0) },
    { label: "Orders", value: String(grossPaid._count) },
    { label: "Completed", value: String(completed) },
    { label: "Total views", value: String(activeViews._sum.viewsCount ?? 0) },
    { label: "Total watchers", value: String(activeViews._sum.watchCount ?? 0) },
    { label: "Offers received", value: String(conversion) },
    { label: "Avg. rating", value: `${sp.averageRating.toFixed(1)}★ (${sp.ratingCount})` },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-ink">Seller analytics</h1>
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

      <h2 className="mb-3 mt-8 text-lg font-bold text-ink">Listings by status</h2>
      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-4 text-sm">
            {["ACTIVE", "PENDING_REVIEW", "RESERVED", "SOLD", "REJECTED", "DRAFT"].map((s) => (
              <div key={s} className="rounded-lg bg-fairway-50 px-3 py-2">
                <span className="font-bold text-ink">{statusCounts[s] ?? 0}</span>{" "}
                <span className="text-muted">{s.replace(/_/g, " ").toLowerCase()}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
