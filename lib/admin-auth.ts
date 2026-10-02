import { getAdminPassword } from "@/lib/env";

export const ADMIN_COOKIE = "admin_session";

export function expectedAdminCookie(): string {
  return Buffer.from(getAdminPassword(), "utf8").toString("base64");
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i]! ^ bufB[i]!;
  }
  return diff === 0;
}

export function readAdminCookie(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ADMIN_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(ADMIN_COOKIE.length + 1));
}

export function isAdminAuthenticated(req: Request): boolean {
  try {
    const cookie = readAdminCookie(req);
    if (!cookie) return false;
    return timingSafeEqualStr(cookie, expectedAdminCookie());
  } catch {
    return false;
  }
}

export function adminLoginCookie(): string {
  return `${ADMIN_COOKIE}=${expectedAdminCookie()}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`;
}

export function adminLogoutCookie(): string {
  return `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function unauthorized() {
  return Response.json(
    { error: "UNAUTHORIZED", message: "Admin authentication required" },
    { status: 401 },
  );
}
