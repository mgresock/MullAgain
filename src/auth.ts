import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { prisma } from "./lib/prisma";
import { env, isGoogleAuthConfigured } from "./lib/env";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!user || !user.passwordHash) return null;
      if (user.accountStatus === "BANNED" || user.accountStatus === "DELETED") return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      return { id: user.id, email: user.email, name: user.name, image: user.avatarUrl };
    },
  }),
];

// Google is optional: only register it when credentials are configured so the
// app boots fine without them.
if (isGoogleAuthConfigured()) {
  providers.push(
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,

    /**
     * For OAuth sign-ins we own the user record (we use JWT sessions, not the
     * adapter). Upsert the user by email — Google verifies emails, so we can
     * mark the email verified and link to an existing password account.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      const email = user.email?.toLowerCase();
      if (!email) return false;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (existing.accountStatus === "BANNED" || existing.accountStatus === "DELETED") return false;
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            lastLoginAt: new Date(),
            emailVerified: existing.emailVerified ?? new Date(),
            name: existing.name ?? user.name,
            avatarUrl: existing.avatarUrl ?? user.image,
          },
        });
      } else {
        await prisma.user.create({
          data: {
            email,
            name: user.name,
            avatarUrl: user.image,
            emailVerified: new Date(),
            lastLoginAt: new Date(),
            verification: { create: { emailVerifiedAt: new Date() } },
          },
        });
      }
      return true;
    },

    /**
     * Enrich the JWT from our DB record so role/status/username are always our
     * canonical values (works for both credentials and OAuth sign-ins).
     */
    async jwt({ token, user }) {
      const email = user?.email ?? token.email;
      if (user && email) {
        const dbUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.accountStatus = dbUser.accountStatus;
          token.username = dbUser.username;
        }
      }
      return token;
    },
  },
});
