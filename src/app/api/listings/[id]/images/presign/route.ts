import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireActiveSeller, Errors } from "@/lib/authz";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { presignSchema, MAX_IMAGES } from "@/lib/validation";
import { presignUpload } from "@/lib/integrations/s3";

/**
 * Issue short-lived presigned S3 PUT URLs. The server picks the key (users never
 * choose arbitrary S3 keys) and validates content-type/size via the Zod schema.
 */
export const POST = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireActiveSeller();
    await enforceRateLimit("imagePresign", user.id);

    const { id } = await params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { sellerId: true, images: { select: { id: true } } },
    });
    if (!listing) throw Errors.notFound("Listing not found.");
    if (listing.sellerId !== user.id) throw Errors.forbidden();

    const { files } = presignSchema.parse(await req.json());
    if (listing.images.length + files.length > MAX_IMAGES) {
      throw Errors.badRequest(`Listings can have at most ${MAX_IMAGES} images.`);
    }

    const uploads = await Promise.all(
      files.map((f) => presignUpload(id, f.contentType)),
    );
    return ok({ uploads });
  },
);
