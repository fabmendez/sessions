import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { AuthFrame } from "@/components/AuthFrame";
import { login } from "@/app/actions/auth";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await getViewer()) redirect("/radar");
  // Only point at the demo account when the demo data is actually there.
  const [demo] = await db.select({ id: users.id }).from(users).where(eq(users.email, "lewis@session.test"));
  return (
    <AuthFrame title="Welcome back" sub="Pick up where your projects left off.">
      <AuthForm action={login} submit="Log in" demo={!!demo} />
      {demo && <p className="mt-3 rounded-lg bg-raised px-3 py-2 text-[13px] text-muted">The demo account is filled in — you'll be Lewis, a London garage producer. Every seeded creator uses the password <span className="font-mono text-text">session</span>.</p>}
      <p className="mt-6 text-sm text-muted">New here? Session is invite-only — ask a member to invite you.</p>
    </AuthFrame>
  );
}
