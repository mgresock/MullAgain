import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireActiveSeller, Errors } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { imageConfirmSchema } from "@/lib/validation";
import { confirmObjectExists, publicUrlForKey } from "@/lib/integrations/s3";

/**
 * Confirm uploaded objects and attach them to the listing. We verify each
 * object actually exists in S3 and that the key belongs to this listing's
 * scoped prefix before emitting a public URL.
 */
export const POST = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireActiveSeller();
    const { id } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { sellerId: true },
    });
    if (!listing) throw Errors.notFound("Listing not found.");
    if (listing.sellerId !== user.id) throw Errors.forbidden();

    const { images } = imageConfirmSchema.parse(await req.json());
    const prefix = `listings/${id}/`;

    const results = [];
    for (const img of images) {
      if (!img.s3Key.startsWith(prefix)) {
        throw Errors.badRequest("Image key does not belong to this listing.");
      }
      const exists = await confirmObjectExists(img.s3Key);
      if (!exists) {
        throw Errors.badRequest(`Upload not found in storage: ${img.s3Key}`);
      }
      const row = await prisma.listingImage.upsert({
        where: { s3Key: img.s3Key },
        create: {
          listingId: id,
          s3Key: img.s3Key,
          publicUrl: publicUrlForKey(img.s3Key),
          sortOrder: img.sortOrder ?? 0,
          altText: img.altText,
          uploadedByUserId: user.id,
          status: "ACTIVE",
        },
        update: { status: "ACTIVE", sortOrder: img.sortOrder ?? 0, altText: img.altText },
      });
      results.push({ id: row.id, publicUrl: row.publicUrl });
    }

    return ok({ images: results });
  },
);
