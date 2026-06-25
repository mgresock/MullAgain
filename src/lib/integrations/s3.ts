import { PutObjectCommand, S3Client, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { env, isS3Configured } from "../env";

/**
 * S3 image storage via short-lived presigned PUT URLs.
 *
 * Security model:
 * - The bucket stays private. The server picks the S3 key (users never choose
 *   arbitrary keys); keys are scoped under `listings/<listingId>/<uuid>.<ext>`.
 * - The server validates content-type and size before signing.
 * - Public URLs are only emitted after the server confirms the object exists.
 *
 * In dev without AWS creds, presign returns a fake local URL so the upload UI
 * can be exercised; `confirmObjectExists` returns true so the flow proceeds.
 */

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: env.AWS_REGION,
      credentials:
        env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.AWS_ACCESS_KEY_ID,
              secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  return client;
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface PresignResult {
  uploadUrl: string;
  s3Key: string;
  publicUrl: string;
}

/** Build the server-controlled key. Users never supply this. */
export function buildImageKey(listingId: string, contentType: string): string {
  const ext = EXT_BY_TYPE[contentType] ?? "bin";
  return `listings/${listingId}/${randomUUID()}.${ext}`;
}

export function publicUrlForKey(s3Key: string): string {
  if (env.S3_PUBLIC_BASE_URL) {
    return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${s3Key}`;
  }
  if (env.S3_BUCKET) {
    return `https://${env.S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${s3Key}`;
  }
  return `/__dev-uploads/${s3Key}`;
}

export async function presignUpload(
  listingId: string,
  contentType: string,
): Promise<PresignResult> {
  const s3Key = buildImageKey(listingId, contentType);
  const publicUrl = publicUrlForKey(s3Key);

  if (!isS3Configured()) {
    return { uploadUrl: `/__dev-uploads/${s3Key}`, s3Key, publicUrl };
  }

  const cmd = new PutObjectCommand({
    Bucket: env.S3_BUCKET!,
    Key: s3Key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3(), cmd, { expiresIn: 300 }); // 5 minutes
  return { uploadUrl, s3Key, publicUrl };
}

/** Confirm the object was actually uploaded before we attach it to a listing. */
export async function confirmObjectExists(s3Key: string): Promise<boolean> {
  if (!isS3Configured()) return true; // dev stub
  try {
    await s3().send(new HeadObjectCommand({ Bucket: env.S3_BUCKET!, Key: s3Key }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteObject(s3Key: string): Promise<void> {
  if (!isS3Configured()) return;
  await s3().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET!, Key: s3Key }));
}
