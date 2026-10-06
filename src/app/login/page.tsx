import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { AuthFrame } from "@/components/AuthFrame";
import { login } from "@/app/actions/auth";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await getViewer()) redirect("/radar");
  return (
    <AuthFrame title="Welcome back" sub="Pick up where your projects left off.">
      <AuthForm action={login} submit="Log in" demo />
      <p className="mt-3 rounded-lg bg-raised px-3 py-2 text-[13px] text-muted">The demo account is filled in — you'll be Lewis, a London garage producer. Every seeded creator uses the password <span className="font-mono text-text">session</span>.</p>
      <p className="mt-6 text-sm text-muted">New here? <Link href="/signup" className="link">Create an account</Link></p>
    </AuthFrame>
  );
}
