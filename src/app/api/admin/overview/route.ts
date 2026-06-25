import { ok, route } from "@/lib/api";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const GET = route(async () => {
  await requireAdmin();
  const [gmv, orders, activeListings, pendingReview, openDisputes, newUsers, openReports] =
    await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: ["PAID", "SHIPPED", "DELIVERED", "COMPLETED"] } },
        _sum: { totalCents: true },
      }),
      prisma.order.count(),
      prisma.listing.count({ where: { status: "ACTIVE" } }),
      prisma.listing.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.dispute.count({ where: { status: { notIn: ["CLOSED", "RESOLVED_SELLER"] } } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } }),
      prisma.report.count({ where: { status: "OPEN" } }),
    ]);
  return ok({
    gmvCents: gmv._sum.totalCents ?? 0,
    orders,
    activeListings,
    pendingReview,
    openDisputes,
    newUsers7d: newUsers,
    openReports,
  });
});
