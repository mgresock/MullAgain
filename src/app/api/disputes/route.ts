import { route, ok } from "@/lib/api";
import { requireUser, isAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

/** List disputes the user is party to (admins see all). */
export const GET = route(async () => {
  const user = await requireUser();
  const where = isAdmin(user)
    ? {}
    : { order: { OR: [{ buyerId: user.id }, { sellerId: user.id }] } };

  const disputes = await prisma.dispute.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      order: { include: { listing: { select: { title: true, slug: true } } } },
    },
  });
  return ok({ disputes });
});
