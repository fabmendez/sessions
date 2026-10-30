import { redirect } from "next/navigation";

// Session is invite-only: accounts are created from invite links (/invite/[token]). Old links land on login.
export default function SignupPage() {
  redirect("/login");
}
