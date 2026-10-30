import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invites, users, creatorProfiles } from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { INVITES_PER_MEMBER, inviteState, invitesLeft, isAdmin } from "@/lib/invites";
import { timeAgo } from "@/lib/format";
import { requestInvite, newInviteLink, withdrawInvite } from "@/app/actions/invites";
import { InviteForm, LinkAction } from "@/components/invites";
import { InviteStatus } from "@/components/InviteStatus";

export const metadata = { title: "Invite people" };

export default async function InvitesPage() {
  const { user, profile } = await requireProfile();
  const admin = isAdmin(user.email);
  const [left, rows] = await Promise.all([
    invitesLeft(db, profile.id, user.email),
    db.select({ invite: invites, handle: creatorProfiles.handle, name: creatorProfiles.displayName })
      .from(invites)
      .leftJoin(users, eq(users.id, invites.acceptedUserId))
      .leftJoin(creatorProfiles, eq(creatorProfiles.userId, users.id))
      .where(eq(invites.invitedById, profile.id))
      .orderBy(desc(invites.createdAt)),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-5xl">Invite people</h1>
      <p className="mt-3 text-muted">
        Session is invite-only. {admin
          ? <>You're an admin, so your invites don't need approval and there's no limit. Requests from members are in <Link href="/admin" className="link">Admin</Link>.</>
          : <>Invite people you'd vouch for — an admin approves each one, then they get a link to join. You have <b className="text-text">{left} of {INVITES_PER_MEMBER}</b> invites left.</>}
      </p>

      <section className="panel mt-8 p-5 sm:p-6">
        <InviteForm action={requestInvite} admin={admin} disabled={!admin && left <= 0} />
        {!admin && left <= 0 && <p className="mt-3 text-sm text-muted">You've used all your invites. One frees up if an invite is declined, expires, or you withdraw it.</p>}
      </section>

      <h2 className="section-title mb-4 mt-12">Your invites</h2>
      {!rows.length ? (
        <p className="text-muted">No invites yet.</p>
      ) : (
        <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl bg-surface">
          {rows.map(({ invite: i, handle, name }) => {
            const state = inviteState(i);
            return (
              <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">{handle ? <Link href={`/u/${handle}`} className="link">{name}</Link> : i.email}</p>
                  <p className="text-[13px] text-faint"><InviteStatus state={state} /> · invited {timeAgo(i.createdAt)}</p>
                </div>
                {(state === "approved" || state === "expired") && (
                  <LinkAction action={newInviteLink} id={i.id} label={state === "expired" ? "New link" : "Get link"} primary={state === "approved"} />
                )}
                {(state === "requested" || state === "approved") && (
                  <form action={withdrawInvite}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className="btn-quiet btn-sm">Withdraw</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
