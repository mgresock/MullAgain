import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { orderStatusLabel } from "@/lib/display";
import { Card, Badge } from "@/components/ui/primitives";
import { ConfirmDeliveryButton, OpenDisputeButton } from "@/components/order-actions";

export const dynamic = "force-dynamic";

const statusColor: Record<string, "green" | "amber" | "blue" | "gray" | "red"> = {
  AWAITING_PAYMENT: "amber",
  PAID: "blue",
  SELLER_TO_SHIP: "blue",
  SHIPPED: "blue",
  DELIVERED: "green",
  COMPLETED: "green",
  DISPUTED: "red",
  REFUNDED: "gray",
  CANCELLED: "gray",
};

export default async function PurchasesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/purchases");

  const orders = await prisma.order.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      listing: { select: { title: true, slug: true } },
      shipment: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-ink">Your purchases</h1>
      {orders.length === 0 ? (
        <Card className="p-10 text-center text-muted">
          No orders yet.{" "}
          <Link href="/marketplace" className="text-fairway-700 hover:underline">
            Browse the marketplace
          </Link>
          .
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link href={`/marketplace/${o.listing.slug}`} className="font-medium hover:underline">
                    {o.listing.title}
                  </Link>
                  <p className="text-sm text-muted">
                    {formatCents(o.totalCents)} · {new Date(o.createdAt).toLocaleDateString()}
                  </p>
                  {o.shipment?.trackingNumber && (
                    <p className="text-xs text-muted">
                      {o.shipment.carrier} · {o.shipment.trackingNumber}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={statusColor[o.status] ?? "gray"}>{orderStatusLabel(o.status)}</Badge>
                  {(o.status === "SHIPPED" || o.status === "DELIVERED") && (
                    <ConfirmDeliveryButton orderId={o.id} />
                  )}
                  {["PAID", "SHIPPED", "DELIVERED", "COMPLETED"].includes(o.status) && (
                    <OpenDisputeButton orderId={o.id} />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
