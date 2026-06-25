import { ok, route } from "@/lib/api";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const GET = route(async () => {
  await requireAdmin();
  const listings = await prisma.listing.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    include: {
      images: { where: { status: "ACTIVE" }, take: 1, orderBy: { sortOrder: "asc" } },
      seller: { select: { email: true, sellerProfile: { select: { sellerTier: true, totalSales: true } } } },
    },
  });
  return ok({ listings });
});
