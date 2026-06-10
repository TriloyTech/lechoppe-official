import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set. PostgreSQL-backed API routes will fail until it is configured.");
}

declare global {
  // eslint-disable-next-line no-var
  var __lechoppePool: Pool | undefined;
}

export const pool = global.__lechoppePool ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== "production") {
  global.__lechoppePool = pool;
}

export const ALLOWED_TABLES = [
  "menu_items",
  "reservations",
  "offers",
  "site_settings",
] as const;

export type AllowedTable = (typeof ALLOWED_TABLES)[number];

export function assertAllowedTable(table: string): asserts table is AllowedTable {
  if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
    throw new Error(`Table not allowed: ${table}`);
  }
}
