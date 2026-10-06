import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { requireProfile } from "@/lib/auth";
import { threadFor } from "@/lib/messaging";
import { categoryName, statusName } from "@/lib/taxonomy";
import { deadlineText, money, timeAgo } from "@/lib/format";
import { db } from "@/db";
import * as s from "@/db/schema";
import { Inbox } from "@/components/Inbox";
import { Avatar } from "@/components/Avatar";
import { Artwork } from "@/components/Artwork";
import { PlayButton } from "@/components/Player";
import { Availability } from "@/components/bits";
import { Composer } from "@/components/Composer";
import { AutoRefresh } from "@/components/AutoRefresh";
import { respondInvite } from "@/app/actions/social";

export const metadata = { title: "Messages" };

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireProfile();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const t = await threadFor(id, profile.id);
  if (!t) notFound();

  const [myProjects, myCalls, contacts] = await Promise.all([
    db.select({ id: s.projects.id, title: s.projects.title }).from(s.projects).innerJoin(s.projectMembers, eq(s.projectMembers.projectId, s.projects.id))
      .where(and(eq(s.projectMembers.profileId, profile.id), eq(s.projectMembers.status, "active"))),
    db.select({ id: s.opportunities.id, title: s.opportunities.title }).from(s.opportunities).where(and(eq(s.opportunities.authorId, profile.id), eq(s.opportunities.status, "open"))),
    db.execute<{ id: string; display_name: string }>(sql`
      select p.id, p.display_name from connections c join creator_profiles p on p.id = case when c.requester_id = ${profile.id} then c.addressee_id else c.requester_id end
      where (c.requester_id = ${profile.id} or c.addressee_id = ${profile.id}) and c.status = 'accepted' and p.id <> ${t.other?.id ?? ""}`),
  ]);

  let lastDay = "";
  return (
    <div className="grid gap-6 md:grid-cols-[320px_1fr]">
      <AutoRefresh />
      <Inbox profileId={profile.id} activeId={id} className="hidden md:block" />
      <section className="flex min-h-[70vh] flex-col">
        <header className="flex items-center gap-3 border-b border-line-soft pb-4">
          <Link href="/messages" className="btn-quiet btn-sm px-2 md:hidden" aria-label="Back to messages">←</Link>
          {t.other && (
            <Link href={`/u/${t.other.handle}`} className="flex items-center gap-3">
              <Avatar name={t.other.displayName} seed={t.other.avatarSeed} url={t.other.avatarUrl} size="md" />
              <span>
                <span className="display block text-2xl leading-none">{t.other.displayName}</span>
                <Availability value={t.other.availability} />
              </span>
            </Link>
          )}
        </header>

        <ol className="flex-1 space-y-3 py-6">
          {t.msgs.map((m) => {
            const mine = m.senderId === profile.id;
            const day = m.createdAt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
            const showDay = day !== lastDay; lastDay = day;
            return (
              <li key={m.id}>
                {showDay && <p className="my-4 text-center text-[12px] text-faint">{day}</p>}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[85%] sm:max-w-[70%]">
                    {m.kind === "text" ? (
                      <p className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 ${mine ? "rounded-br-md bg-signal text-signal-ink" : "rounded-bl-md bg-raised"}`}>{m.body}</p>
                    ) : <Rich m={m} t={t} mine={mine} />}
                    <p className={`mt-1 text-[11px] text-faint ${mine ? "text-right" : ""}`}>{timeAgo(m.createdAt)}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="sticky bottom-16 bg-bg pb-2 sm:bottom-0">
          <Composer conversationId={id} attachments={[
            { group: "Your projects", items: myProjects.map((p) => ({ value: `project:${p.id}`, label: p.title })) },
            { group: "Your open calls", items: myCalls.map((o) => ({ value: `opportunity:${o.id}`, label: o.title })) },
            { group: "Recommend someone", items: contacts.map((c) => ({ value: `profile:${c.id}`, label: c.display_name })) },
          ]} />
        </div>
      </section>
    </div>
  );
}

type Thread = NonNullable<Awaited<ReturnType<typeof threadFor>>>;

function Rich({ m, t, mine }: { m: Thread["msgs"][number]; t: Thread; mine: boolean }) {
  const shell = "block w-72 max-w-full overflow-hidden rounded-2xl border border-line bg-surface";
  if (m.kind === "project_invite" || m.kind === "project_link") {
    const p = t.projects.find((x) => x.id === m.refId);
    if (!p) return <p className="text-sm text-faint">This project is no longer available.</p>;
    const membership = t.memberships.find((x) => x.projectId === p.id);
    return (
      <div className={shell}>
        <Link href={`/projects/${p.slug}`} className="flex items-center gap-3 p-3 hover:bg-raised">
          <Artwork seed={p.artSeed} url={p.artworkUrl} className="size-14 rounded-lg" />
          <span className="min-w-0">
            <span className="block text-[12px] text-signal-text">{m.kind === "project_invite" ? `Invite · ${m.refRole}` : "Project"}</span>
            <span className="display block truncate text-xl">{p.title}</span>
            <span className="block text-[12px] text-muted">{statusName(p.status)}</span>
          </span>
        </Link>
        {m.kind === "project_invite" && !mine && (
          <div className="border-t border-line-soft p-3">
            {membership?.status === "invited" ? (
              <form action={respondInvite} className="flex gap-2">
                <input type="hidden" name="projectId" value={p.id} />
                <button name="accept" value="1" className="btn-primary btn-sm flex-1">Join as {m.refRole}</button>
                <button name="accept" value="0" className="btn-quiet btn-sm">Decline</button>
              </form>
            ) : <p className="text-[13px] text-muted">{membership?.status === "active" ? "You joined this project." : "Invite no longer open."}</p>}
          </div>
        )}
        {m.kind === "project_link" && p.demoUrl && (
          <div className="flex items-center gap-2 border-t border-line-soft p-3 text-[13px] text-muted"><PlayButton src={p.demoUrl} title={p.title} size="sm" /> Play demo</div>
        )}
      </div>
    );
  }
  if (m.kind === "opportunity_link") {
    const o = t.opps.find((x) => x.id === m.refId);
    if (!o) return <p className="text-sm text-faint">This open call is no longer available.</p>;
    return (
      <Link href={`/opportunities/${o.id}`} className={`${shell} p-4 hover:bg-raised`}>
        <span className="block text-[12px] text-signal-text">Open call · {categoryName(o.category)}</span>
        <span className="display mt-0.5 block text-xl leading-tight">{o.title}</span>
        <span className="mt-2 block font-mono text-[12px] text-muted">{o.paid ? money(o.budget, o.currency) : "Unpaid"} · {deadlineText(o.deadline)}</span>
      </Link>
    );
  }
  const p = t.profiles.find((x) => x.id === m.refId);
  if (!p) return null;
  return (
    <Link href={`/u/${p.handle}`} className={`${shell} flex items-center gap-3 p-3 hover:bg-raised`}>
      <Avatar name={p.displayName} seed={p.avatarSeed} url={p.avatarUrl} size="md" />
      <span><span className="display block text-xl">{p.displayName}</span><span className="text-[12px] text-muted">{p.city} · <Availability value={p.availability} /></span></span>
    </Link>
  );
}
