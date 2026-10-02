import { getDatabase } from "@netlify/database";

type Database = ReturnType<typeof getDatabase>;

let cached: Database | null = null;

function getDb(): Database {
  if (!cached) {
    // Lazy init: must not run at build/page-data collection time.
    cached = getDatabase();
  }
  return cached;
}

/**
 * Lazy proxy so route modules can `import { db } from "@/lib/db"` and use
 * `db.sql` without calling getDatabase() at module load / Next build time.
 */
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, instance);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(instance);
    }
    return value;
  },
});
