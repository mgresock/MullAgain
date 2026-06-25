import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function BuyerDisputesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/disputes");

  const disputes = await prisma.dispute.findMany({
    where: { order: { OR: [{ buyerId: user.id }, { sellerId: user.id }] } },
    orderBy: { updatedAt: "desc" },
    include: { order: { include: { listing: { select: { title: true, slug: true } } } } },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-ink">Your disputes</h1>
      {disputes.length === 0 ? (
        <Card className="p-10 text-center text-muted">No disputes — hopefully it stays that way. ⛳</Card>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <Card key={d.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/marketplace/${d.order.listing.slug}`} className="font-medium hover:underline">
                  {d.order.listing.title}
                </Link>
                <p className="text-sm text-muted">
                  {d.reason.replace(/_/g, " ").toLowerCase()} · opened{" "}
                  {new Date(d.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge color={d.status.startsWith("RESOLVED") || d.status === "REFUNDED" ? "green" : "amber"}>
                {d.status.replace(/_/g, " ").toLowerCase()}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
