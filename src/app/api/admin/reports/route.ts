import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import type { ReportStatus } from "@prisma/client";

export const GET = route(async (req: NextRequest) => {
  await requireAdmin();
  const status = (req.nextUrl.searchParams.get("status") as ReportStatus | null) ?? "OPEN";
  const reports = await prisma.report.findMany({
    where: { status },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      reporter: { select: { email: true } },
      reportedUser: { select: { email: true } },
      listing: { select: { title: true, slug: true } },
    },
  });
  return ok({ reports });
});
