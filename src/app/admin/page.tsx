import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { Card, CardBody } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [gmvAgg, orders, activeListings, pending, disputes, newUsers, suspicious] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: ["PAID", "SHIPPED", "DELIVERED", "COMPLETED"] } },
      _sum: { totalCents: true },
    }),
    prisma.order.count(),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.listing.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.dispute.count({ where: { status: { notIn: ["CLOSED", "RESOLVED_SELLER"] } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } }),
    prisma.report.count({ where: { status: "OPEN" } }),
  ]);

  const cards = [
    { label: "GMV (paid+)", value: formatCents(gmvAgg._sum.totalCents ?? 0) },
    { label: "Total orders", value: String(orders) },
    { label: "Active listings", value: String(activeListings) },
    { label: "Pending review", value: String(pending), href: "/admin/listings/pending" },
    { label: "Open disputes", value: String(disputes), href: "/admin/disputes" },
    { label: "New users (7d)", value: String(newUsers) },
    { label: "Open reports", value: String(suspicious) },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">Marketplace overview</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => {
          const content = (
            <Card className={c.href ? "transition hover:shadow-md" : ""}>
              <CardBody>
                <p className="text-sm text-muted">{c.label}</p>
                <p className="mt-1 text-2xl font-bold text-ink">{c.value}</p>
              </CardBody>
            </Card>
          );
          return c.href ? (
            <Link key={c.label} href={c.href}>
              {content}
            </Link>
          ) : (
            <div key={c.label}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
