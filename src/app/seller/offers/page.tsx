import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { Card, Badge } from "@/components/ui/primitives";
import { SellerOfferActions } from "@/components/offer-actions";

export const dynamic = "force-dynamic";

export default async function SellerOffersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/seller/offers");

  const offers = await prisma.offer.findMany({
    where: { sellerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      listing: { select: { title: true, priceCents: true } },
      buyer: { select: { name: true, username: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-ink">Offers received</h1>
      {offers.length === 0 ? (
        <Card className="p-10 text-center text-muted">No offers yet.</Card>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => (
            <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{o.listing.title}</p>
                <p className="text-sm text-muted">
                  {o.buyer.name ?? o.buyer.username} offered{" "}
                  <span className="font-semibold text-fairway-700">{formatCents(o.amountCents)}</span>{" "}
                  <span className="text-xs">(asking {formatCents(o.listing.priceCents)})</span>
                </p>
                {o.message && <p className="mt-1 text-sm italic text-muted">“{o.message}”</p>}
              </div>
              {o.status === "PENDING" ? (
                <SellerOfferActions offerId={o.id} />
              ) : (
                <Badge color={o.status === "ACCEPTED" ? "green" : "gray"}>
                  {o.status.toLowerCase()}
                </Badge>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
