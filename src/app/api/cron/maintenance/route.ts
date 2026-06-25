import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runMaintenance } from "@/lib/services/maintenance";

export const dynamic = "force-dynamic";

/**
 * Scheduled maintenance endpoint. Guard with a bearer token:
 *   Authorization: Bearer $CRON_SECRET
 * Vercel Cron sends this automatically when CRON_SECRET is set. If no secret is
 * configured, the endpoint only runs in non-production (dev convenience).
 */
async function handle(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (env.CRON_SECRET) {
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 403 });
  }

  const result = await runMaintenance();
  return NextResponse.json({ ok: true, data: result });
}

// Vercel Cron sends GET; allow POST for manual/job-runner triggers too.
export const GET = handle;
export const POST = handle;
