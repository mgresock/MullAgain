import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS } from "@/lib/display";
import { ListingCategory } from "@prisma/client";
import { Card, CardBody } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories — MullAgain" };

export default async function CategoriesPage() {
  const counts = await prisma.listing.groupBy({
    by: ["category"],
    where: { status: "ACTIVE" },
    _count: true,
  });
  const countMap = new Map(counts.map((c) => [c.category, c._count]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-ink">Shop by category</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Object.values(ListingCategory).map((c) => (
          <Link key={c} href={`/marketplace?category=${c}`}>
            <Card className="transition hover:shadow-md">
              <CardBody>
                <p className="font-semibold text-ink">{CATEGORY_LABELS[c]}</p>
                <p className="text-sm text-muted">{countMap.get(c) ?? 0} active</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
