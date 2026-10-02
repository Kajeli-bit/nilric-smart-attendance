import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

function requireEnv(name: string, value: string | undefined): string {
  const v = value?.trim();
  if (!v) {
    throw new Error(
      `Auth configuration error: missing ${name}. Set it in Netlify Environment variables and redeploy.`,
    );
  }
  return v;
}

const secret = process.env.AUTH_SECRET;
const googleClientId =
  process.env.AUTH_GOOGLE_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET?.trim() ||
  process.env.GOOGLE_CLIENT_SECRET?.trim();

// Fail fast in production with a clear message instead of Auth.js's generic
// "There is a problem with the server configuration".
if (process.env.NODE_ENV === "production") {
  requireEnv("AUTH_SECRET", secret);
  requireEnv("AUTH_GOOGLE_ID or GOOGLE_CLIENT_ID", googleClientId);
  requireEnv("AUTH_GOOGLE_SECRET or GOOGLE_CLIENT_SECRET", googleClientSecret);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  secret: secret || undefined,
  // Netlify (and most reverse proxies) are not auto-detected like Vercel.
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
});
