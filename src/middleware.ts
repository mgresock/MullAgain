import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

/**
 * Edge middleware: coarse gate that redirects unauthenticated users away from
 * protected sections. This is defense-in-depth ONLY — every Server Action and
 * Route Handler still re-checks auth/authorization server-side, because page or
 * middleware checks do not protect mutations.
 */
const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = ["/dashboard", "/seller", "/admin", "/checkout"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (needsAuth && !req.auth) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/seller/:path*", "/admin/:path*", "/checkout/:path*"],
};
