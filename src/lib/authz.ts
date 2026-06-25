import { Role, AccountStatus, type User, type SellerProfile } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "./prisma";

/**
 * Authorization helpers. Treat every Server Action and Route Handler as a public
 * endpoint: these helpers re-load the user from the database and re-check live
 * account status on every mutation. We never trust client-supplied identity,
 * role, or ownership, and we don't trust the JWT alone for suspension state.
 */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const Errors = {
  unauthorized: (msg = "You must be signed in.") => new HttpError(401, msg, "UNAUTHORIZED"),
  forbidden: (msg = "You do not have permission to do that.") =>
    new HttpError(403, msg, "FORBIDDEN"),
  notFound: (msg = "Not found.") => new HttpError(404, msg, "NOT_FOUND"),
  badRequest: (msg = "Invalid request.") => new HttpError(400, msg, "BAD_REQUEST"),
  conflict: (msg = "Conflict.") => new HttpError(409, msg, "CONFLICT"),
  rateLimited: (msg = "Too many requests. Please slow down.") =>
    new HttpError(429, msg, "RATE_LIMITED"),
};

export interface AuthedUser extends User {
  sellerProfile: SellerProfile | null;
}

/** Returns the current user (with seller profile) or null. No throwing. */
export async function getCurrentUser(): Promise<AuthedUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    include: { sellerProfile: true },
  });
}

/** Require a signed-in, non-suspended/banned user. Re-checks DB status. */
export async function requireUser(): Promise<AuthedUser> {
  const user = await getCurrentUser();
  if (!user) throw Errors.unauthorized();
  if (user.accountStatus !== AccountStatus.ACTIVE) {
    throw Errors.forbidden(`Your account is ${user.accountStatus.toLowerCase()}.`);
  }
  return user;
}

/** Require a user whose email is verified (needed to buy, message, offer, sell). */
export async function requireVerifiedEmail(): Promise<AuthedUser> {
  const user = await requireUser();
  if (!user.emailVerified) {
    throw Errors.forbidden("Please verify your email address first.");
  }
  return user;
}

/**
 * Require a fully onboarded seller: verified email + phone, seller profile,
 * Stripe connected account, onboarding complete and payouts enabled. This is
 * the gate for publishing listings and accepting orders.
 */
export async function requireActiveSeller(): Promise<AuthedUser & { sellerProfile: SellerProfile }> {
  const user = await requireVerifiedEmail();
  if (!user.phoneVerified) {
    throw Errors.forbidden("Phone verification is required to sell.");
  }
  const sp = user.sellerProfile;
  if (!sp) throw Errors.forbidden("Create a seller profile first.");
  if (!sp.stripeConnectedAccountId) {
    throw Errors.forbidden("Connect a Stripe account to sell.");
  }
  if (!sp.onboardingComplete || !sp.stripePayoutsEnabled || !sp.stripeChargesEnabled) {
    throw Errors.forbidden("Complete Stripe onboarding before selling.");
  }
  return user as AuthedUser & { sellerProfile: SellerProfile };
}

export async function requireAdmin(): Promise<AuthedUser> {
  const user = await requireUser();
  if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
    throw Errors.forbidden("Admin access required.");
  }
  return user;
}

export function isAdmin(user: Pick<User, "role">): boolean {
  return user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
}

/** Assert the user owns the resource (or is an admin). */
export function assertOwnerOrAdmin(user: AuthedUser, ownerId: string): void {
  if (user.id !== ownerId && !isAdmin(user)) {
    throw Errors.forbidden();
  }
}
