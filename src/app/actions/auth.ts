"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession } from "@/lib/auth";
import { LIMITS, blockedFor, hit, clear, clientIp, waitMessage } from "@/lib/rate-limit";

export type FormState = { error?: string } | undefined;

const creds = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters for your password."),
});

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const parsed = creds.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password } = parsed.data;
  const ipKey: [string, typeof LIMITS.signupIp] = [`signup:ip:${await clientIp()}`, LIMITS.signupIp];
  const wait = await blockedFor([ipKey]);
  if (wait) return { error: waitMessage(wait) };
  await hit([ipKey]);
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (exists) return { error: "There's already an account with that email. Log in instead." };
  const [u] = await db.insert(users).values({ email, passwordHash: await bcrypt.hash(password, 10) }).returning();
  await createSession(u.id);
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
