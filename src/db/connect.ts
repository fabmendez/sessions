// Database connection. Always speaks to a PostgreSQL server: either a real one (DATABASE_URL),
// or the built-in one that `npm run local` starts (embedded Postgres served on 127.0.0.1:5433).
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate as runMigrations } from "drizzle-orm/postgres-js/migrator";
import type { SQL } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;
export type Conn = {
  db: DB;
  /** Raw SQL that resolves to an array of rows. */
  exec: <T>(q: SQL) => Promise<T[]>;
  /** Run a multi-statement SQL string (scripts only). */
  run: (text: string) => Promise<void>;
  migrate: (folder: string) => Promise<void>;
  close: () => Promise<void>;
};

export async function connect(opts: { max?: number } = {}): Promise<Conn> {
  // `next build` imports server modules; give it a client that never actually connects.
  const building = process.env.NEXT_PHASE === "phase-production-build";
  const url = building ? "postgres://build@127.0.0.1:1/unused" : process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("No database configured. Run `npm run local` (built-in database) or set DATABASE_URL in .env.");
  const embedded = process.env.SESSION_EMBEDDED_DB === "1";
  const client = postgres(url, {
    max: opts.max ?? (embedded ? 4 : 10),
    onnotice: () => {},
    // Named prepared statements get a random per-connection prefix, so they're safe on the built-in server's shared backend.
  });
  const db = drizzle(client, { schema });
  return {
    db,
    exec: async <T,>(q: SQL) => (await db.execute(q)) as unknown as T[],
    run: async (text) => { await client.unsafe(text); },
    migrate: (folder) => runMigrations(db, { migrationsFolder: folder }),
    close: () => client.end(),
  };
}
