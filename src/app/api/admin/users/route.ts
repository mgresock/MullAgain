import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** Search/list users for the admin console. `?q=` matches email/name/username. */
export const GET = route(async (req: NextRequest) => {
  await requireAdmin();
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      role: true,
      accountStatus: true,
      emailVerified: true,
      phoneVerified: true,
      createdAt: true,
      sellerProfile: { select: { sellerTier: true, totalSales: true, onboardingComplete: true } },
    },
  });
  return ok({ users });
});
