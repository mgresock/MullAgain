import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, Badge } from "@/components/ui/primitives";
import { ShoppingBag, Heart, MessageSquare, ShieldAlert, Store } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const [purchases, watching] = await Promise.all([
    prisma.order.count({ where: { buyerId: user.id } }),
    prisma.watchlistItem.count({ where: { userId: user.id } }),
  ]);

  const tiles = [
    { href: "/dashboard/purchases", icon: ShoppingBag, label: "Purchases", value: purchases },
    { href: "/dashboard/watchlist", icon: Heart, label: "Watchlist", value: watching },
    { href: "/dashboard/messages", icon: MessageSquare, label: "Messages", value: "—" },
    { href: "/dashboard/disputes", icon: ShieldAlert, label: "Disputes", value: "—" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Hi, {user.name ?? "golfer"} 👋</h1>
        {!user.emailVerified && (
          <Link href="/verify-email">
            <Badge color="amber">Verify your email</Badge>
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="transition hover:shadow-md">
              <CardBody>
                <t.icon className="h-5 w-5 text-fairway-600" />
                <p className="mt-2 text-sm text-muted">{t.label}</p>
                <p className="text-2xl font-bold text-ink">{t.value}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <Link href="/seller/dashboard">
        <Card className="mt-6 transition hover:shadow-md">
          <CardBody className="flex items-center gap-3">
            <Store className="h-6 w-6 text-fairway-600" />
            <div>
              <p className="font-semibold text-ink">Seller hub</p>
              <p className="text-sm text-muted">Manage listings, orders, offers and payouts.</p>
            </div>
          </CardBody>
        </Card>
      </Link>
    </div>
  );
}
