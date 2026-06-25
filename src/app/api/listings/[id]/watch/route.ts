import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireUser, Errors } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

/** Add the listing to the user's watchlist (idempotent). */
export const POST = route(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    const listing = await prisma.listing.findUnique({ where: { id }, select: { id: true } });
    if (!listing) throw Errors.notFound("Listing not found.");

    const existing = await prisma.watchlistItem.findUnique({
      where: { userId_listingId: { userId: user.id, listingId: id } },
    });
    if (!existing) {
      await prisma.$transaction([
        prisma.watchlistItem.create({ data: { userId: user.id, listingId: id } }),
        prisma.listing.update({ where: { id }, data: { watchCount: { increment: 1 } } }),
      ]);
    }
    return ok({ watching: true });
  },
);

/** Remove from watchlist (idempotent). */
export const DELETE = route(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    const existing = await prisma.watchlistItem.findUnique({
      where: { userId_listingId: { userId: user.id, listingId: id } },
    });
    if (existing) {
      await prisma.$transaction([
        prisma.watchlistItem.delete({ where: { id: existing.id } }),
        prisma.listing.update({ where: { id }, data: { watchCount: { decrement: 1 } } }),
      ]);
    }
    return ok({ watching: false });
  },
);
