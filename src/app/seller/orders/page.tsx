import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { orderStatusLabel } from "@/lib/display";
import { Card, Badge } from "@/components/ui/primitives";
import { ShipForm } from "@/components/ship-form";

export const dynamic = "force-dynamic";

export default async function SellerOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/seller/orders");

  const orders = await prisma.order.findMany({
    where: { sellerId: user.id, status: { notIn: ["AWAITING_PAYMENT", "CANCELLED"] } },
    orderBy: { createdAt: "desc" },
    include: { listing: { select: { title: true } }, buyer: { select: { name: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-ink">Orders</h1>
      {orders.length === 0 ? (
        <Card className="p-10 text-center text-muted">No orders yet.</Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{o.listing.title}</p>
                <p className="text-sm text-muted">
                  {o.buyer.name} · nets {formatCents(o.sellerProceedsCents)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={o.status === "COMPLETED" ? "green" : "blue"}>
                  {orderStatusLabel(o.status)}
                </Badge>
                {(o.status === "PAID" || o.status === "SELLER_TO_SHIP") && (
                  <ShipForm orderId={o.id} />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
