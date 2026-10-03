/**
 * Apply SQL migrations to Vercel/Neon Postgres.
 *
 * Usage:
 *   POSTGRES_URL=postgres://... npm run db:migrate
 *   npm run db:migrate          # uses .env POSTGRES_URL / DATABASE_URL
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

config({ path: path.join(root, ".env") });
config({ path: path.join(root, ".env.local") });

const url =
  process.env.POSTGRES_URL?.trim() ||
  process.env.POSTGRES_URL_NON_POOLING?.trim() ||
  process.env.POSTGRES_PRISMA_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  "";

if (!url) {
  console.error(
    "Missing POSTGRES_URL (or DATABASE_URL). Set it in .env or the Vercel project.",
  );
  process.exit(1);
}

const sql = postgres(url, {
  max: 1,
  ssl: "require",
  prepare: false,
  idle_timeout: 30,
  connect_timeout: 15,
});

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const applied = new Set(
    (await sql`SELECT id FROM schema_migrations`).map((r) => String(r.id)),
  );

  const dir = path.join(root, "db", "migrations");
  const files = (await readdir(dir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip  ${file}`);
      continue;
    }
    const body = await readFile(path.join(dir, file), "utf8");
    console.log(`apply ${file}`);
    await sql.unsafe(body);
    await sql`INSERT INTO schema_migrations (id) VALUES (${file}) ON CONFLICT (id) DO NOTHING`;
  }

  // Also ensure consolidated schema is present (fresh DBs / partial history)
  const schemaPath = path.join(root, "db", "schema.sql");
  const schema = await readFile(schemaPath, "utf8");
  console.log("apply db/schema.sql (idempotent)");
  await sql.unsafe(schema);

  console.log("done");
}

main()
  .then(() => sql.end({ timeout: 5 }))
  .catch(async (err) => {
    console.error(err);
    await sql.end({ timeout: 5 }).catch(() => {});
    process.exit(1);
  });
