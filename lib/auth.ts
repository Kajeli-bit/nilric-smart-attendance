import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export function requireEnv(name: string, value: string | undefined): string {
  const v = value?.trim();
  if (!v) {
    throw new Error(
      `Auth configuration error: missing ${name}. Set it in Vercel → Project Settings → Environment Variables, then redeploy.`,
    );
  }
  return v;
}

export function getAuthConfigIssues(): string[] {
  const secret = process.env.AUTH_SECRET?.trim();
  const googleClientId = (
    process.env.AUTH_GOOGLE_ID?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    ""
  ).trim();
  const googleClientSecret = (
    process.env.AUTH_GOOGLE_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    ""
  ).trim();

  const issues: string[] = [];
  if (!secret) issues.push("AUTH_SECRET");
  if (!googleClientId) issues.push("AUTH_GOOGLE_ID (or GOOGLE_CLIENT_ID)");
  if (!googleClientSecret) issues.push("AUTH_GOOGLE_SECRET (or GOOGLE_CLIENT_SECRET)");
  return issues;
}

/**
 * Lazy NextAuth init. Config factory runs on first request (not at import),
 * so `next build` does not require env vars.
 *
 * Missing production env throws a named error — pages catch this and show
 * a setup panel instead of Next's blank server-error page.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const secret = process.env.AUTH_SECRET;
  const googleClientId =
    process.env.AUTH_GOOGLE_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim();
  const googleClientSecret =
    process.env.AUTH_GOOGLE_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (process.env.NODE_ENV === "production") {
    requireEnv("AUTH_SECRET", secret);
    requireEnv("AUTH_GOOGLE_ID or GOOGLE_CLIENT_ID", googleClientId);
    requireEnv("AUTH_GOOGLE_SECRET or GOOGLE_CLIENT_SECRET", googleClientSecret);
  }

  const config: NextAuthConfig = {
    providers: [
      Google({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      }),
    ],
    secret: secret || undefined,
    // Vercel (and most reverse proxies) are not auto-detected like Vercel-idiomatic hosts.
    trustHost: true,
    session: { strategy: "jwt" },
    pages: {
      signIn: "/",
    },
    callbacks: {
      jwt({ token, account, profile }) {
        if (account?.provider === "google" && profile && "email" in profile) {
          token.email = (profile.email as string) ?? token.email;
          token.name = (profile.name as string) ?? token.name;
          token.picture = (profile.image as string) ?? token.picture;
        }
        return token;
      },
      session({ session, token }) {
        if (session.user) {
          session.user.email = (token.email as string) ?? session.user.email;
          session.user.name = (token.name as string) ?? session.user.name;
          session.user.image = (token.picture as string) ?? session.user.image;
        }
        return session;
      },
    },
  };

  return config;
});
