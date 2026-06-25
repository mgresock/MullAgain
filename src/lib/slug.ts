import { prisma } from "./prisma";

function baseSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/** Random suffix to keep slugs unique and unguessable-ish. */
function suffix(len = 6): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

/**
 * Build a unique listing slug. Retries with a fresh suffix on the rare collision.
 */
export async function uniqueListingSlug(title: string): Promise<string> {
  const base = baseSlug(title) || "listing";
  for (let i = 0; i < 5; i++) {
    const candidate = `${base}-${suffix()}`;
    const existing = await prisma.listing.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
