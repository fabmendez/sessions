import "server-only";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { exec } from "@/db";

/**
 * Fixed-window rate limiting backed by Postgres, so it works across restarts and needs no extra service.
 * Each key holds a counter that resets once its window has passed.
 */
export type Limit = { max: number; windowMs: number };

export const LIMITS = {
  /** Failed logins against one account. */
  loginEmail: { max: 10, windowMs: 15 * 60_000 },
  /** Failed logins from one address (covers guessing across many accounts). */
  loginIp: { max: 30, windowMs: 15 * 60_000 },
  /** Accounts created from one address. */
  signupIp: { max: 5, windowMs: 60 * 60_000 },
} satisfies Record<string, Limit>;

/** Seconds until every given key is under its limit again, or 0 if none is blocked. Doesn't count an attempt. */
export async function blockedFor(entries: [key: string, limit: Limit][]): Promise<number> {
  if (!entries.length) return 0;
  const keys = entries.map(([k]) => k);
  const rows = await exec<{ key: string; count: number; reset_at: Date | string }>(
    sql`select key, count, reset_at from rate_limits where key in (${sql.join(keys.map((k) => sql`${k}`), sql`, `)}) and reset_at > now()`,
  );
  let wait = 0;
  for (const r of rows) {
    const limit = entries.find(([k]) => k === r.key)![1];
    if (r.count >= limit.max) wait = Math.max(wait, Math.ceil((new Date(r.reset_at).getTime() - Date.now()) / 1000));
  }
  return wait;
}

/** Count one attempt against each key (atomic upsert; a key whose window has passed starts again at 1). */
export async function hit(entries: [key: string, limit: Limit][]) {
  for (const [key, { windowMs }] of entries) {
    await exec(sql`
      insert into rate_limits (key, count, reset_at) values (${key}, 1, now() + ${windowMs} * interval '1 millisecond')
      on conflict (key) do update set
        count    = case when rate_limits.reset_at <= now() then 1 else rate_limits.count + 1 end,
        reset_at = case when rate_limits.reset_at <= now() then excluded.reset_at else rate_limits.reset_at end`);
  }
  // Occasionally sweep expired counters so the table stays small.
  if (Math.random() < 0.02) await exec(sql`delete from rate_limits where reset_at <= now()`);
}

export async function clear(keys: string[]) {
  if (keys.length) await exec(sql`delete from rate_limits where key in (${sql.join(keys.map((k) => sql`${k}`), sql`, `)})`);
}

/**
 * The client's address. Behind Traefik (or `next start` directly) the last X-Forwarded-For entry is the one
 * added by the nearest proxy, so it can't be spoofed by a client-supplied header the way the first entry can.
 */
export async function clientIp() {
  const h = await headers();
  const xff = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return xff?.at(-1) || h.get("x-real-ip") || "unknown";
}

export function waitMessage(seconds: number) {
  const mins = Math.ceil(seconds / 60);
  return `Too many attempts. Try again in ${mins <= 1 ? "a minute" : `${mins} minutes`}.`;
}
