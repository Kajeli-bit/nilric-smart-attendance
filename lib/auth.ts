import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

function cleanEnv(value: string | undefined): string {
  if (!value) return "";
  // Strip accidental quotes/whitespace/newlines from dashboard pastes.
  return value.trim().replace(/^['"]+|['"]+$/g, "").trim();
}

export function requireEnv(name: string, value: string | undefined): string {
  const v = cleanEnv(value);
  if (!v) {
    throw new Error(
      `Auth configuration error: missing ${name}. Set it in Vercel → Project Settings → Environment Variables, then redeploy.`,
    );
  }
  return v;
}

export function getAuthConfigIssues(): string[] {
  const secret = cleanEnv(process.env.AUTH_SECRET);
  const googleClientId =
    cleanEnv(process.env.AUTH_GOOGLE_ID) || cleanEnv(process.env.GOOGLE_CLIENT_ID);
  const googleClientSecret =
    cleanEnv(process.env.AUTH_GOOGLE_SECRET) ||
    cleanEnv(process.env.GOOGLE_CLIENT_SECRET);

  const issues: string[] = [];
  if (!secret) issues.push("AUTH_SECRET");
  if (!googleClientId) issues.push("AUTH_GOOGLE_ID (or GOOGLE_CLIENT_ID)");
  if (!googleClientSecret)
    issues.push("AUTH_GOOGLE_SECRET (or GOOGLE_CLIENT_SECRET)");
  return issues;
}

/** Host of AUTH_URL if set; empty otherwise. Never returns secrets. */
export function getAuthUrlHost(): string | null {
  const raw = cleanEnv(process.env.AUTH_URL);
  if (!raw) return null;
  try {
    return new URL(raw).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Lazy NextAuth init. Config factory runs on first request (not at import),
 * so `next build` does not require env vars.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(async (request) => {
  const secret = requireEnv("AUTH_SECRET", process.env.AUTH_SECRET);
  const googleClientId = requireEnv(
    "AUTH_GOOGLE_ID or GOOGLE_CLIENT_ID",
    cleanEnv(process.env.AUTH_GOOGLE_ID) || cleanEnv(process.env.GOOGLE_CLIENT_ID),
  );
  const googleClientSecret = requireEnv(
    "AUTH_GOOGLE_SECRET or GOOGLE_CLIENT_SECRET",
    cleanEnv(process.env.AUTH_GOOGLE_SECRET) ||
      cleanEnv(process.env.GOOGLE_CLIENT_SECRET),
  );

  // Prefer the live request host on Vercel. A stale AUTH_URL (e.g. old
  // Netlify domain) makes Auth.js emit error=Configuration / redirect_uri_mismatch.
  const requestHost = request?.headers?.get("host")?.toLowerCase() ?? null;
  const authUrlHost = getAuthUrlHost();
  const authUrl = cleanEnv(process.env.AUTH_URL) || undefined;
  const hostMatches =
    !authUrlHost || !requestHost || authUrlHost === requestHost;

  if (process.env.NODE_ENV === "production" && authUrl && !hostMatches) {
    console.error(
      `auth/config AUTH_URL host mismatch: AUTH_URL=${authUrlHost} request=${requestHost}`,
    );
  }

  const config: NextAuthConfig = {
    providers: [
      Google({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      }),
    ],
    secret,
    // Required on Vercel — reverse proxy host is not auto-trusted.
    trustHost: true,
    session: { strategy: "jwt" },
    pages: {
      signIn: "/",
    },
    // Only pin baseURL when AUTH_URL matches the current request host.
    // Wrong AUTH_URL is a common cause of Auth.js Configuration errors.
    ...(authUrl && hostMatches ? { baseURL: authUrl } : {}),
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
