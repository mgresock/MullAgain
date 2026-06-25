import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

/** List the current user's orders. `?role=seller` returns sales; default = purchases. */
export const GET = route(async (req: NextRequest) => {
  const user = await requireUser();
  const role = req.nextUrl.searchParams.get("role");
  const where = role === "seller" ? { sellerId: user.id } : { buyerId: user.id };

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      listing: { select: { title: true, slug: true } },
      shipment: true,
    },
  });
  return ok({ orders });
});
