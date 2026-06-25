import { NextRequest } from "next/server";
import { created, ok, route } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validation";

export const GET = route(async () => {
  const user = await requireUser();
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return ok({ addresses });
});

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = addressSchema.parse(await req.json());

  const address = await prisma.$transaction(async (tx) => {
    // Enforce a single default per type.
    if (body.isDefaultShipping) {
      await tx.address.updateMany({ where: { userId: user.id }, data: { isDefaultShipping: false } });
    }
    if (body.isDefaultReturn) {
      await tx.address.updateMany({ where: { userId: user.id }, data: { isDefaultReturn: false } });
    }
    return tx.address.create({ data: { userId: user.id, ...body } });
  });

  return created({ id: address.id });
});
