// One command to run Session locally with no database install:
//   npm run local          → start built-in database + app (dev mode); seeds demo data on first run
//   npm run local reset    → wipe the built-in database, re-seed, then start
//   npm run local prod     → same, but builds and runs the production server
// The database lives in ./.pglite (embedded PostgreSQL compiled to WebAssembly — works on Windows ARM, macOS, Linux).
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import postgres from "postgres";

const mode = process.argv[2] ?? "dev";
const PORT = Number(process.env.SESSION_DB_PORT ?? 5433);
const DIR = ".pglite";
const URL = `postgres://postgres:postgres@127.0.0.1:${PORT}/postgres`;

if (mode === "reset" && existsSync(DIR)) { rmSync(DIR, { recursive: true, force: true }); console.log("Wiped the built-in database."); }

const pg = new PGlite(DIR);
await pg.waitReady;
const server = new PGLiteSocketServer({ db: pg, port: PORT, host: "127.0.0.1", maxConnections: 50 });
atomicExtendedQueries(server);
try { await server.start(); }
catch (e) {
  console.error(`\nCouldn't start the built-in database on port ${PORT} — is Session already running in another window?\n`, (e as Error).message);
  process.exit(1);
}
console.log(`Built-in database running on 127.0.0.1:${PORT} (data in ${path.resolve(DIR)})`);

const env = { ...process.env, DATABASE_URL: URL, SESSION_EMBEDDED_DB: "1" };
const bin = (pkg: string, rel: string) => path.join(process.cwd(), "node_modules", pkg, rel);
const run = (args: string[]) => new Promise<number>((resolve) => {
  const child = spawn(process.execPath, args, { env, stdio: "inherit" });
  children.add(child);
  child.on("exit", (code) => { children.delete(child); resolve(code ?? 0); });
});
const children = new Set<ReturnType<typeof spawn>>();
const tsx = (file: string) => run([bin("tsx", "dist/cli.mjs"), file]);
const next = (...args: string[]) => run([bin("next", "dist/bin/next"), ...args]);

async function shutdown(code = 0) {
  for (const c of children) c.kill();
  try { await server.stop(); } catch {}
  try { await pg.close(); } catch {}
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (await tsx("src/db/migrate.ts")) await shutdown(1);

const probe = postgres(URL, { max: 1, prepare: false, onnotice: () => {} });
const [{ n }] = await probe`select count(*)::int as n from users`;
await probe.end();
if (n === 0) {
  console.log("Adding demo data…");
  if (await tsx("src/db/seed/index.ts")) await shutdown(1);
}

if (mode === "prod") {
  if (await next("build")) await shutdown(1);
  console.log("\nSession is running at http://localhost:3000  (Ctrl+C to stop)\n");
  await shutdown(await next("start", "-p", "3000"));
} else {
  console.log("\nSession is starting at http://localhost:3000  (Ctrl+C to stop)\n");
  await shutdown(await next("dev", "-p", "3000"));
}

/**
 * The socket server runs every connection on one embedded Postgres backend and queues each protocol
 * message separately. Unnamed statements (what Drizzle uses) take two round trips — Parse+Describe, then
 * Bind+Execute — so another connection's Parse in between would replace the statement. This gate:
 *  1. holds a connection's extended-protocol messages until its Sync and sends them as one unit, and
 *  2. lets a connection that has parsed but not yet executed keep the backend until it executes.
 */
function atomicExtendedQueries(srv: PGLiteSocketServer) {
  type Q = { enqueue: (id: number, msg: Uint8Array, onData: (d: Uint8Array) => void) => Promise<number>; lastHandlerId: number | null };
  const queue = (srv as unknown as { queryQueue: Q }).queryQueue;
  const enqueue = queue.enqueue.bind(queue);
  const pending = new Map<number, Uint8Array[]>();
  const HOLD = new Set([0x50, 0x42, 0x44, 0x45, 0x43]); // Parse, Bind, Describe, Execute, Close
  let owner: number | null = null;
  let ownerTimer: NodeJS.Timeout | undefined;
  let waiters: (() => void)[] = [];
  const wake = () => { const w = waiters; waiters = []; w.forEach((f) => f()); };
  const release = () => { owner = null; clearTimeout(ownerTimer); wake(); };
  // Wait while another connection owns the backend, or is mid-transaction (the server already keeps
  // transactions exclusive; claiming ownership then would deadlock).
  const busyFor = (id: number) =>
    (owner !== null && owner !== id) || (srv.db.isInTransaction() && queue.lastHandlerId !== null && queue.lastHandlerId !== id);
  // Check and claim in the same tick so two waiters can't both get through.
  const acquire = async (id: number) => {
    while (busyFor(id)) await new Promise<void>((r) => { waiters.push(r); setTimeout(r, 50); });
    owner = id;
  };

  const chains = new Map<number, Promise<unknown>>();
  queue.enqueue = (id, msg, onData) => {
    if (HOLD.has(msg[0])) {
      const list = pending.get(id) ?? [];
      list.push(msg);
      pending.set(id, list);
      return Promise.resolve(0);
    }
    const batch = [...(pending.get(id) ?? []), msg];
    pending.delete(id);
    // Keep each connection's batches in arrival order, even while one waits for the backend.
    const run = (chains.get(id) ?? Promise.resolve()).then(() => runBatch(id, batch, onData));
    chains.set(id, run.catch(() => {}));
    return run;
  };

  async function runBatch(id: number, batch: Uint8Array[], onData: (d: Uint8Array) => void) {
    await acquire(id);
    const types = new Set(batch.map((m) => m[0]));
    const executes = types.has(0x45) || types.has(0x51) || types.has(0x58); // Execute, simple Query, Terminate
    const keep = !executes && types.has(0x50); // parsed only — it'll be back to bind+execute, keep the backend
    clearTimeout(ownerTimer);
    if (keep) ownerTimer = setTimeout(release, 10_000); // never let a stalled client block everyone
    try { return await enqueue(id, batch.length === 1 ? batch[0] : Buffer.concat(batch), onData); }
    finally { if (!keep && owner === id) release(); }
  }
}
