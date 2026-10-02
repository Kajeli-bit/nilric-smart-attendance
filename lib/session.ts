import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/env";

export interface SessionUser {
  email: string;
  name: string | null;
  image: string | null;
}

export async function requireWorker(): Promise<SessionUser | Response> {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return Response.json(
      {
        error: "UNAUTHORIZED",
        message: "Sign in with Google to continue",
      },
      { status: 401 },
    );
  }
  return {
    email,
    name: session?.user?.name ?? null,
    image: session?.user?.image ?? null,
  };
}

export async function requireAdmin(): Promise<SessionUser | Response> {
  const user = await requireWorker();
  if (user instanceof Response) return user;
  if (!isAdminEmail(user.email)) {
    return Response.json(
      {
        error: "FORBIDDEN",
        message: "Admin access required",
      },
      { status: 403 },
    );
  }
  return user;
}

export function isResponse(value: SessionUser | Response): value is Response {
  return value instanceof Response;
}
