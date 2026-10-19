import { auth, getAuthConfigIssues } from "@/lib/auth";

export interface PageSession {
  email: string | null;
  name: string | null;
  image: string | null;
  /** Missing auth env vars, surfaced instead of a blank server error page. */
  setupIssues: string[];
}

/**
 * Read the session for a server page.
 *
 * Never throws: a misconfigured or unreachable Auth.js returns an empty
 * session plus the list of missing env vars so pages can render the
 * setup checklist instead of a 500.
 */
export async function readPageSession(): Promise<PageSession> {
  try {
    const session = await auth();
    const email = session?.user?.email?.trim().toLowerCase() ?? null;
    return {
      email,
      name: session?.user?.name ?? null,
      image: session?.user?.image ?? null,
      setupIssues: [],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const setupIssues = getAuthConfigIssues();
    if (
      setupIssues.length > 0 ||
      /AUTH_|Auth configuration|server configuration|MissingSecret/i.test(message)
    ) {
      return { email: null, name: null, image: null, setupIssues };
    }
    console.error("page auth error", err);
    return { email: null, name: null, image: null, setupIssues };
  }
}
