import { BrandHeader } from "@/components/BrandHeader";

/**
 * Shown when server-side auth() throws because Vercel env vars are missing.
 * Prevents Next's blank "server error" page on `/` and `/check-in`.
 */
export function SetupRequiredPanel({
  issues,
  title = "App setup required",
}: {
  issues?: string[];
  title?: string;
}) {
  const list =
    issues && issues.length > 0
      ? issues
      : ["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "POSTGRES_URL"];

  return (
    <main className="mx-auto w-full max-w-md py-8">
      <BrandHeader
        title="Nilric Smart Attendance"
        subtitle="Finish Vercel setup to enable Google sign-in."
      />
      <div className="card overflow-hidden rounded-3xl">
        <div className="h-1 w-full bg-gradient-to-r from-brand-300 via-brand-500 to-brand-300" />
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            The site is deployed, but environment variables are not set on
            Vercel yet. Add them in{" "}
            <strong>Project → Settings → Environment Variables</strong>, then{" "}
            <strong>Redeploy</strong>.
          </p>

          <div className="mt-4 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900 ring-1 ring-brand-100">
            <p className="font-semibold">Missing or incomplete</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-brand-800">
              {list.map((item) => (
                <li key={item}>
                  <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs">
                    {item}
                  </code>
                </li>
              ))}
            </ul>
          </div>

          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>
              Create secrets:{" "}
              <code className="text-xs">openssl rand -base64 32</code> →{" "}
              <code className="text-xs">AUTH_SECRET</code>
            </li>
            <li>
              Google OAuth client → <code className="text-xs">AUTH_GOOGLE_ID</code>{" "}
              / <code className="text-xs">AUTH_GOOGLE_SECRET</code>
            </li>
            <li>
              Vercel Marketplace → <strong>Neon Postgres</strong> → sets{" "}
              <code className="text-xs">POSTGRES_URL</code>
            </li>
            <li>
              <code className="text-xs">AUTH_TRUST_HOST=true</code>,{" "}
              <code className="text-xs">AUTH_URL</code> = this site URL, plus{" "}
              <code className="text-xs">ADMIN_EMAILS</code> and{" "}
              <code className="text-xs">OFFICE_*</code>
            </li>
            <li>
              Google redirect URI:{" "}
              <code className="text-xs">
                https://YOUR-PROJECT.vercel.app/api/auth/callback/google
              </code>
            </li>
            <li>Run migrations: npm run db:migrate</li>
            <li>Redeploy</li>
          </ol>

          <p className="mt-4 text-xs text-slate-500">
            Safe checks (no secrets):{" "}
            <a
              className="text-brand-700 underline"
              href="/api/auth/debug"
              target="_blank"
              rel="noreferrer"
            >
              /api/auth/debug
            </a>{" "}
            ·{" "}
            <a
              className="text-brand-700 underline"
              href="/api/attendance/diag"
              target="_blank"
              rel="noreferrer"
            >
              /api/attendance/diag
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
