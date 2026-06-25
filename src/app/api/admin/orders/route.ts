import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import type { OrderStatus, Prisma } from "@prisma/client";

export const GET = route(async (req: NextRequest) => {
  await requireAdmin();
  const status = req.nextUrl.searchParams.get("status") as OrderStatus | null;
  const where: Prisma.OrderWhereInput = status ? { status } : {};

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      listing: { select: { title: true } },
      buyer: { select: { email: true } },
      seller: { select: { email: true } },
      paymentEvents: { select: { type: true, createdAt: true } },
      shipment: { select: { status: true, trackingNumber: true } },
    },
  });
  return ok({ orders });
});
