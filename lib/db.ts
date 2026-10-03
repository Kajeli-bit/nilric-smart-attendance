import postgres from "postgres";

type PostgresSql = ReturnType<typeof postgres>;

/** Tagged-template SQL matching how API routes call `db.sql<T>` / `db.sql.unsafe`. */
export type SqlTag = {
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
  unsafe<T = Record<string, unknown>>(
    query: string,
    params?: readonly unknown[],
  ): Promise<T[]>;
};

let cached: PostgresSql | null = null;

function resolveConnectionString(): string {
  const url =
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";

  if (!url) {
    throw new Error(
      "DATABASE_NOT_CONFIGURED: Set POSTGRES_URL (Vercel Marketplace Postgres / Neon) in project environment variables.",
    );
  }
  return url;
}

/**
 * Lazy Postgres.js client.
 * Must not connect at module import / Next build time.
 */
function getSql(): PostgresSql {
  if (cached) return cached;

  const url = resolveConnectionString();

  cached = postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: "require",
    // Transaction-mode poolers break named prepared statements.
    prepare: false,
  });

  return cached;
}

function tagSql(sql: PostgresSql): SqlTag {
  const tagged = ((
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => {
    return sql(strings, ...(values as never[])) as Promise<never[]>;
  }) as unknown as SqlTag;

  tagged.unsafe = ((query: string, params?: readonly unknown[]) => {
    return sql.unsafe(query, params as never[]) as Promise<never[]>;
  }) as SqlTag["unsafe"];

  return tagged;
}

export type DbClient = {
  sql: SqlTag;
};

/**
 * Lazy proxy: `import { db } from "@/lib/db"` then `await db.sql\`...\``
 * or `await db.sql.unsafe(query, params)`.
 */
export const db: DbClient = new Proxy({} as DbClient, {
  get(_target, prop) {
    if (prop === "sql") return tagSql(getSql());
    const sql = getSql();
    const value = Reflect.get(sql, prop, sql);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(sql);
    }
    return value;
  },
});
