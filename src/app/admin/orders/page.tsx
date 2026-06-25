import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { orderStatusLabel } from "@/lib/display";
import { Card, Badge } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      listing: { select: { title: true } },
      buyer: { select: { email: true } },
      seller: { select: { email: true } },
      shipment: { select: { trackingNumber: true, status: true } },
      _count: { select: { paymentEvents: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">Orders</h1>
      <Card className="divide-y divide-[var(--border)]">
        {orders.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">{o.listing.title}</p>
              <p className="text-xs text-muted">
                {o.buyer.email} → {o.seller.email} · {formatCents(o.totalCents)} · fee{" "}
                {formatCents(o.platformFeeCents)} · {o._count.paymentEvents} payment events
                {o.shipment?.trackingNumber ? ` · ${o.shipment.trackingNumber}` : ""}
              </p>
            </div>
            <Badge color={o.status === "COMPLETED" ? "green" : o.status === "DISPUTED" ? "red" : "blue"}>
              {orderStatusLabel(o.status)}
            </Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
