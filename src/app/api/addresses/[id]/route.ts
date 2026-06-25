import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireUser, Errors } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validation";

async function ownedAddress(userId: string, id: string) {
  const addr = await prisma.address.findUnique({ where: { id } });
  if (!addr) throw Errors.notFound("Address not found.");
  if (addr.userId !== userId) throw Errors.forbidden();
  return addr;
}

export const PATCH = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    await ownedAddress(user.id, id);
    const body = addressSchema.partial().parse(await req.json());

    const updated = await prisma.$transaction(async (tx) => {
      if (body.isDefaultShipping) {
        await tx.address.updateMany({ where: { userId: user.id }, data: { isDefaultShipping: false } });
      }
      if (body.isDefaultReturn) {
        await tx.address.updateMany({ where: { userId: user.id }, data: { isDefaultReturn: false } });
      }
      return tx.address.update({ where: { id }, data: body });
    });
    return ok({ id: updated.id });
  },
);

export const DELETE = route(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    await ownedAddress(user.id, id);
    await prisma.address.delete({ where: { id } });
    return ok({ deleted: true });
  },
);
