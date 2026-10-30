"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invites, users } from "@/db/schema";
import { findInvite } from "@/lib/invites";
import { createSession, destroySession } from "@/lib/auth";
import { LIMITS, blockedFor, hit, clear, clientIp, waitMessage } from "@/lib/rate-limit";

export type FormState = { error?: string } | undefined;

/** Create an account from an approved invite link. The email comes from the invite, not the form. */
export async function acceptInvite(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };
  const ipKey: [string, typeof LIMITS.inviteIp] = [`invite:ip:${await clientIp()}`, LIMITS.inviteIp];
  const wait = await blockedFor([ipKey]);
  if (wait) return { error: waitMessage(wait) };

  const inv = await findInvite(db, token);
  if (inv.state !== "valid") {
    await hit([ipKey]);
    return { error: "This invite link no longer works. Ask whoever invited you for a new one." };
  }
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, inv.email));
  if (exists) return { error: "There's already an account with this email. Log in instead." };

  const passwordHash = await bcrypt.hash(password, 10);
  // Claim the invite and create the account together, so one link can only ever make one account.
  const user = await db.transaction(async (tx) => {
    const [claimed] = await tx.update(invites).set({ acceptedAt: new Date() })
      .where(and(eq(invites.id, inv.id), isNull(invites.acceptedAt))).returning({ id: invites.id });
    if (!claimed) return null;
    const [u] = await tx.insert(users).values({ email: inv.email, passwordHash }).returning();
    await tx.update(invites).set({ acceptedUserId: u.id }).where(eq(invites.id, inv.id));
    return u;
  });
  if (!user) return { error: "This invite has already been used. Log in instead." };
  await createSession(user.id);
  redirect("/onboarding");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const keys: [string, typeof LIMITS.loginEmail][] = [
    [`login:email:${email}`, LIMITS.loginEmail],
    [`login:ip:${await clientIp()}`, LIMITS.loginIp],
  ];
  const wait = await blockedFor(keys);
  if (wait) return { error: waitMessage(wait) };
  const [u] = await db.select().from(users).where(eq(users.email, email));
  if (!u?.passwordHash || !(await bcrypt.compare(password, u.passwordHash))) {
    await hit(keys);
    return { error: "That email and password don't match an account." };
  }
  await clear([keys[0][0]]);
  await createSession(u.id);
  redirect("/radar");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
