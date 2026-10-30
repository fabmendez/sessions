import Link from "next/link";
import { count, desc, eq, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { invites, users, creatorProfiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { canEmail, inviteState, type InviteState } from "@/lib/invites";
import { timeAgo } from "@/lib/format";
import { approveInvite, declineInvite, newInviteLink, requestInvite, revokeInvite } from "@/app/actions/invites";
import { InviteForm, LinkAction } from "@/components/invites";
import { InviteStatus } from "@/components/InviteStatus";

export const metadata = { title: "Admin" };

const inviter = alias(creatorProfiles, "inviter");
const joined = alias(creatorProfiles, "joined");

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireAdmin();
  const show = (await searchParams).show as InviteState | "all" | undefined;

  const [rows, [{ members }], [{ accepted }]] = await Promise.all([
    db.select({
      invite: invites,
      inviterName: inviter.displayName, inviterHandle: inviter.handle,
      joinedName: joined.displayName, joinedHandle: joined.handle,
    })
      .from(invites)
      .leftJoin(inviter, eq(inviter.id, invites.invitedById))
      .leftJoin(users, eq(users.id, invites.acceptedUserId))
      .leftJoin(joined, eq(joined.userId, users.id))
      .orderBy(desc(invites.createdAt)),
    db.select({ members: count() }).from(users),
    db.select({ accepted: count() }).from(invites).where(isNotNull(invites.acceptedAt)),
  ]);
  const all = rows.map((r) => ({ ...r, state: inviteState(r.invite) }));
  const requests = all.filter((r) => r.state === "requested").sort((a, b) => +a.invite.createdAt - +b.invite.createdAt);
  const counts = all.reduce<Record<string, number>>((m, r) => ({ ...m, [r.state]: (m[r.state] ?? 0) + 1 }), {});
  const filter = show && show !== "all" ? show : null;
  const listed = all.filter((r) => r.state !== "requested" && (!filter || r.state === filter));

  const By = ({ name, handle }: { name: string | null; handle: string | null }) =>
    handle ? <Link href={`/u/${handle}`} className="link">{name}</Link> : <span>the command line</span>;

  return (
    <div className="space-y-12">
      <div>
        <h1 className="display text-5xl">Admin</h1>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-muted">
          <span><b className="text-text">{members}</b> members</span>
          <span><b className="text-text">{accepted}</b> joined by invite</span>
          <span><b className="text-text">{requests.length}</b> waiting for approval</span>
          <span>Email: {canEmail() ? <span className="text-ok">on — links are emailed</span> : <span>off — copy links and send them yourself</span>}</span>
        </div>
      </div>

      <section>
        <h2 className="section-title mb-4">Waiting for approval</h2>
        {!requests.length ? (
          <p className="text-muted">Nothing waiting. New requests from members show up here.</p>
        ) : (
          <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl bg-surface">
            {requests.map(({ invite: i, inviterName, inviterHandle }) => (
              <li key={i.id} className="flex flex-wrap items-start gap-x-4 gap-y-3 px-4 py-4">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="text-[15px] font-medium">{i.email}</p>
                  <p className="text-[13px] text-muted">Invited by <By name={inviterName} handle={inviterHandle} /> · {timeAgo(i.createdAt)}</p>
                  {i.note && <p className="mt-1.5 text-sm">“{i.note}”</p>}
                </div>
                <LinkAction action={approveInvite} id={i.id} label="Approve" primary>
                  <form action={declineInvite}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className="btn-quiet btn-sm">Decline</button>
                  </form>
                </LinkAction>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="max-w-2xl">
        <h2 className="section-title mb-1">Invite someone</h2>
        <p className="mb-4 text-sm text-muted">Your invites are approved straight away.</p>
        <div className="panel p-5 sm:p-6"><InviteForm action={requestInvite} admin /></div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="section-title">All invites</h2>
          <nav className="flex flex-wrap gap-1 text-sm">
            {(["all", "approved", "joined", "expired", "declined"] as const).map((k) => (
              <Link key={k} href={k === "all" ? "/admin" : `/admin?show=${k}`}
                className={`rounded-full px-3 py-1.5 ${(filter ?? "all") === k ? "bg-raised text-text" : "text-muted hover:text-text"}`}>
                {{ all: "All", approved: "Link ready", joined: "Joined", expired: "Expired", declined: "Declined" }[k]}
                {k !== "all" && counts[k] ? ` ${counts[k]}` : ""}
              </Link>
            ))}
          </nav>
        </div>
        {!listed.length ? (
          <p className="text-muted">None.</p>
        ) : (
          <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl bg-surface">
            {listed.map(({ invite: i, state, inviterName, inviterHandle, joinedName, joinedHandle }) => (
              <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="truncate text-[15px]">
                    {joinedHandle ? <><Link href={`/u/${joinedHandle}`} className="link">{joinedName}</Link> <span className="text-faint">· {i.email}</span></> : i.email}
                  </p>
                  <p className="text-[13px] text-faint">
                    <InviteStatus state={state} /> · by <By name={inviterName} handle={inviterHandle} /> · {timeAgo(i.createdAt)}
                  </p>
                </div>
                {(state === "approved" || state === "expired") && <LinkAction action={newInviteLink} id={i.id} label="New link" />}
                {state !== "joined" && (
                  <form action={revokeInvite}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className="btn-quiet btn-sm">Delete</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
