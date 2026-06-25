import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe base config. Contains NO database or Node-only imports so it can be
 * used by middleware running on the edge runtime. Providers that need the DB are
 * added in `src/auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
  callbacks: {
    // Persist identity, role and status into the JWT so authorization checks do
    // not need a DB round-trip on every request. Sensitive state (suspension)
    // is still re-verified server-side on mutations via `requireUser`.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // @ts-expect-error custom fields injected by the credentials authorize()
        token.role = user.role;
        // @ts-expect-error custom field
        token.accountStatus = user.accountStatus;
        // @ts-expect-error custom field
        token.username = user.username ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        // @ts-expect-error augmenting session user
        session.user.role = token.role;
        // @ts-expect-error augmenting session user
        session.user.accountStatus = token.accountStatus;
        // @ts-expect-error augmenting session user
        session.user.username = token.username;
      }
      return session;
    },
  },
  providers: [], // populated in src/auth.ts
} satisfies NextAuthConfig;
