import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireUser, Errors } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { updateMeSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

/** Current user profile, verification state, and seller summary. */
export const GET = route(async () => {
  const user = await requireUser();
  const verification = await prisma.userVerification.findUnique({ where: { userId: user.id } });
  return ok({
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role,
    accountStatus: user.accountStatus,
    emailVerified: Boolean(user.emailVerified),
    phoneVerified: Boolean(user.phoneVerified),
    verification,
    seller: user.sellerProfile,
  });
});

/** Update editable profile fields. Username uniqueness is enforced. */
export const PATCH = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = updateMeSchema.parse(await req.json());

  if (body.username && body.username !== user.username) {
    const taken = await prisma.user.findUnique({ where: { username: body.username } });
    if (taken) throw Errors.conflict("That username is taken.");
  }

  // Changing the phone number invalidates phone verification.
  const phoneChanged = body.phone !== undefined && body.phone !== user.phone;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: body.name ?? undefined,
      username: body.username ?? undefined,
      avatarUrl: body.avatarUrl ?? undefined,
      phone: body.phone ?? undefined,
      ...(phoneChanged ? { phoneVerified: null } : {}),
    },
  });
  await audit({ actorUserId: user.id, action: "user.profile_updated", entityType: "User", entityId: user.id });

  return ok({ id: updated.id, name: updated.name, username: updated.username });
});
