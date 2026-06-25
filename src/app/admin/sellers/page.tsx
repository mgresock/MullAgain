import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminSellersPage() {
  const sellers = await prisma.sellerProfile.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { email: true, username: true, accountStatus: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">Sellers</h1>
      <Card className="divide-y divide-[var(--border)]">
        {sellers.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">
                {s.user.username ? (
                  <Link href={`/sellers/${s.user.username}`} className="hover:underline">
                    {s.displayName}
                  </Link>
                ) : (
                  s.displayName
                )}{" "}
                <span className="text-xs text-muted">{s.user.email}</span>
              </p>
              <p className="text-xs text-muted">
                {s.sellerTier} · {s.totalSales} sales · {s.averageRating.toFixed(1)}★
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge color={s.stripeChargesEnabled ? "green" : "gray"}>
                charges {s.stripeChargesEnabled ? "on" : "off"}
              </Badge>
              <Badge color={s.stripePayoutsEnabled ? "green" : "gray"}>
                payouts {s.stripePayoutsEnabled ? "on" : "off"}
              </Badge>
              <Badge color={s.onboardingComplete ? "green" : "amber"}>
                {s.onboardingComplete ? "onboarded" : "pending"}
              </Badge>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
