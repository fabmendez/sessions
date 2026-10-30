import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { AuthFrame } from "@/components/AuthFrame";
import { AcceptInviteForm } from "@/components/invites";
import { acceptInvite } from "@/app/actions/auth";
import { getViewer } from "@/lib/auth";
import { findInvite } from "@/lib/invites";

export const metadata = { title: "You're invited", robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  if (await getViewer()) redirect("/radar");
  const { token } = await params;
  const inv = await findInvite(db, token);

  if (inv.state !== "valid") {
    const who = inv.state !== "invalid" && inv.inviterName ? inv.inviterName : "whoever invited you";
    const copy = {
      used: { title: "Already used", sub: "This invite has already been used to create an account." },
      expired: { title: "Link expired", sub: `Invite links last 14 days. Ask ${who} to send you a new one.` },
      invalid: { title: "Link not valid", sub: "This invite link doesn't work — it may have been replaced by a newer one. Check you have the latest link." },
    }[inv.state];
    return (
      <AuthFrame title={copy.title} sub={copy.sub}>
        <Link href="/login" className="btn-secondary">Log in</Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="You're invited"
      sub={`${inv.inviterName ?? "The Session team"} invited you to Session. Choose a password, then two minutes of setup and you'll see who to work with.`}
    >
      <AcceptInviteForm action={acceptInvite} token={token} email={inv.email} />
      <p className="mt-6 text-sm text-muted">Already have an account? <Link href="/login" className="link">Log in</Link></p>
    </AuthFrame>
  );
}
