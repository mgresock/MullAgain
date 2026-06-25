import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/listing-card";
import { Card } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/watchlist");

  const items = await prisma.watchlistItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        include: { images: { where: { status: "ACTIVE" }, take: 1, orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-ink">Your watchlist</h1>
      {items.length === 0 ? (
        <Card className="p-10 text-center text-muted">
          You aren’t watching anything yet. Tap the heart on a listing to save it.
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(({ listing: l }) => (
            <ListingCard
              key={l.id}
              listing={{
                slug: l.slug,
                title: l.title,
                brand: l.brand,
                priceCents: l.priceCents,
                originalPriceCents: l.originalPriceCents,
                condition: l.condition,
                imageUrl: l.images[0]?.publicUrl ?? null,
                locationState: l.locationState,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
