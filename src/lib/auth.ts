import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, creatorProfiles } from "@/db/schema";

const COOKIE = "session_token";
// HTTPS-only cookies in production, unless explicitly turned off (e.g. serving over http://ip:port).
const secureCookies = () => process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false";
const TTL_DAYS = 30;
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: secureCookies(), path: "/", expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  jar.delete(COOKIE);
}

/** The signed-in user and their creator profile (profile is null until onboarding creates it). */
export const getViewer = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ user: users, profile: creatorProfiles })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(creatorProfiles, eq(creatorProfiles.userId, users.id))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
});

/** For pages/actions that need a fully onboarded creator. */
export async function requireProfile() {
  const v = await getViewer();
  if (!v) redirect("/login");
  if (!v.profile?.onboardedAt) redirect("/onboarding");
  return { user: v.user, profile: v.profile! };
}

export async function requireUser() {
  const v = await getViewer();
  if (!v) redirect("/login");
  return v;
}
