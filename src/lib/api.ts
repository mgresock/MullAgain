import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./authz";
import { IllegalTransitionError } from "./state-machines";

/** Standard JSON success envelope. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function created<T>(data: T) {
  return NextResponse.json({ ok: true, data }, { status: 201 });
}

/** Map known errors to clean HTTP responses; hide internals for unknown ones. */
export function fail(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", code: "VALIDATION", issues: error.flatten() },
      { status: 422 },
    );
  }
  if (error instanceof IllegalTransitionError) {
    return NextResponse.json(
      { ok: false, error: error.message, code: "ILLEGAL_TRANSITION" },
      { status: 409 },
    );
  }
  console.error("[api] unhandled error:", error);
  return NextResponse.json(
    { ok: false, error: "Something went wrong.", code: "INTERNAL" },
    { status: 500 },
  );
}

/** Wrap a route handler so thrown HttpError/ZodError become proper responses. */
export function route<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      return fail(err);
    }
  };
}

/** Pull client metadata for audit logs from a request. */
export function requestMeta(req: Request) {
  const h = req.headers;
  const ipAddress =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const userAgent = h.get("user-agent");
  return { ipAddress, userAgent };
}
