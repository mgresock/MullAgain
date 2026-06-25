import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured, isS3Configured, isEmailConfigured, isSmsConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Liveness + dependency status. Returns 200 when the database is reachable. */
export async function GET() {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }

  const body = {
    ok: db,
    db,
    integrations: {
      stripe: isStripeConfigured(),
      s3: isS3Configured(),
      email: isEmailConfigured(),
      sms: isSmsConfigured(),
      redis: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    },
    time: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: db ? 200 : 503 });
}
