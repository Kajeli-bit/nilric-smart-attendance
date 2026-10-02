import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ authenticated: false, isAdmin: false });
  }
  return NextResponse.json({
    authenticated: true,
    isAdmin: isAdminEmail(email),
    user: {
      email,
      name: session?.user?.name ?? null,
      image: session?.user?.image ?? null,
    },
  });
}
