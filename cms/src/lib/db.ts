import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set (use cms/.env.local)");
}

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

export async function query<T extends import("pg").QueryResultRow = import("pg").QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return pool.query<T>(text, params);
}
