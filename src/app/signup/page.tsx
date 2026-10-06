import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { AuthFrame } from "@/components/AuthFrame";
import { signup } from "@/app/actions/auth";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Create an account" };

export default async function SignupPage() {
  if (await getViewer()) redirect("/radar");
  return (
    <AuthFrame title="Make your profile" sub="Two minutes of setup and you'll see who to work with.">
      <AuthForm action={signup} submit="Create account" />
      <p className="mt-6 text-sm text-muted">Already have an account? <Link href="/login" className="link">Log in</Link></p>
    </AuthFrame>
  );
}
