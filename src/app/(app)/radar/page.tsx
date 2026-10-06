import Link from "next/link";
import { and, eq, inArray, sql, desc } from "drizzle-orm";
import { requireProfile } from "@/lib/auth";
import { loadProfiles, allOnboardedProfileIds } from "@/lib/profiles";
import { loadOpportunities, loadProjects, openNow, projectActivityFeed } from "@/lib/work";
import { matchCreator, matchOpportunity } from "@/lib/match";
import { unreadCount } from "@/lib/inbox";
import { timeAgo, plural } from "@/lib/format";
import { db, exec } from "@/db";
import * as s from "@/db/schema";
import { CreatorCard, OpportunityCard } from "@/components/cards";
import { Avatar } from "@/components/Avatar";
import { Artwork } from "@/components/Artwork";
import { Empty, SectionHead, StatusTag } from "@/components/bits";
import { ConfirmCredit } from "@/components/ConfirmCredit";
import { respondInvite, respondConnection } from "@/app/actions/social";

export const metadata = { title: "Radar" };

export default async function RadarPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { profile } = await requireProfile();
  const [me] = await loadProfiles([profile.id]);

  const [invites, pendingCredits, toReview, connReqs, unread, everyone, opps, myProjectIds, followedIds, sceneIds] = await Promise.all([
    db.select({ projectId: s.projects.id, slug: s.projects.slug, title: s.projects.title, artSeed: s.projects.artSeed, artworkUrl: s.projects.artworkUrl, role: s.projectMembers.role, owner: s.creatorProfiles.displayName })
      .from(s.projectMembers).innerJoin(s.projects, eq(s.projects.id, s.projectMembers.projectId)).innerJoin(s.creatorProfiles, eq(s.creatorProfiles.id, s.projects.ownerId))
      .where(and(eq(s.projectMembers.profileId, me.id), eq(s.projectMembers.status, "invited"))),
    db.select({ id: s.credits.id, role: s.credits.role, title: s.projects.title, slug: s.projects.slug, artSeed: s.projects.artSeed, artworkUrl: s.projects.artworkUrl })
      .from(s.credits).innerJoin(s.projects, eq(s.projects.id, s.credits.projectId)).where(and(eq(s.credits.profileId, me.id), eq(s.credits.confirmed, false))),
    db.select({ id: s.opportunities.id, title: s.opportunities.title, n: sql<number>`count(*)::int` })
      .from(s.opportunityApplications).innerJoin(s.opportunities, eq(s.opportunities.id, s.opportunityApplications.opportunityId))
      .where(and(eq(s.opportunities.authorId, me.id), eq(s.opportunities.status, "open"), inArray(s.opportunityApplications.status, ["pending", "shortlisted"])))
      .groupBy(s.opportunities.id),
    db.select({ id: s.connections.id, p: { handle: s.creatorProfiles.handle, displayName: s.creatorProfiles.displayName, avatarSeed: s.creatorProfiles.avatarSeed, avatarUrl: s.creatorProfiles.avatarUrl, city: s.creatorProfiles.city } })
      .from(s.connections).innerJoin(s.creatorProfiles, eq(s.creatorProfiles.id, s.connections.requesterId))
      .where(and(eq(s.connections.addresseeId, me.id), eq(s.connections.status, "pending"))),
    unreadCount(me.id),
    allOnboardedProfileIds(),
    loadOpportunities(and(openNow, sql`${s.opportunities.authorId} <> ${me.id}`), me.id),
    db.select({ id: s.projectMembers.projectId }).from(s.projectMembers).where(and(eq(s.projectMembers.profileId, me.id), eq(s.projectMembers.status, "active"))).then((r) => r.map((x) => x.id)),
    db.select({ id: s.projectFollows.projectId }).from(s.projectFollows).where(eq(s.projectFollows.profileId, me.id)).then((r) => r.map((x) => x.id)),
    Promise.resolve(me.sceneIds),
  ]);

  // Creator matches: exclude people I'm already connected to or already working with.
  const connected = new Set((await exec<{ id: string }>(sql`
    select case when requester_id = ${me.id} then addressee_id else requester_id end as id from connections
    where (requester_id = ${me.id} or addressee_id = ${me.id}) and status = 'accepted'`)).map((r) => r.id));
  const others = await loadProfiles(everyone.filter((id) => id !== me.id));
  const people = others.filter((p) => !connected.has(p.id)).map((p) => ({ p, m: matchCreator(me, p) })).sort((a, b) => b.m.score - a.m.score).slice(0, 3);

  const callsForMe = opps.filter((o) => !o.myApplication).map((o) => ({ o, m: matchOpportunity(me, o) })).filter((x) => x.m.score >= 30).sort((a, b) => b.m.score - a.m.score).slice(0, 4);
  const myApplied = opps.filter((o) => o.myApplication);

  const activeProjects = await loadProjects(myProjectIds.length || followedIds.length
    ? and(inArray(s.projects.id, [...myProjectIds, ...followedIds]), sql`${s.projects.status} in ('idea','recruiting','in_progress','mixing')`)
    : sql`false`);

  // Collaborator activity: things happening on projects my connections are on, that I'm not on.
  const collabProjectIds = connected.size
    ? (await db.selectDistinct({ id: s.projectMembers.projectId }).from(s.projectMembers)
        .where(and(inArray(s.projectMembers.profileId, [...connected]), eq(s.projectMembers.status, "active")))).map((r) => r.id).filter((id) => !myProjectIds.includes(id))
    : [];
  const collabActivity = (await projectActivityFeed(collabProjectIds, 12)).filter((x) => x.actor && x.actor.id !== me.id && x.a.kind !== "created").slice(0, 5);

  // Scene activity: new calls and projects in my scenes in the last fortnight.
  const sceneNews = sceneIds.length ? await db.select({ id: s.opportunities.id, title: s.opportunities.title, createdAt: s.opportunities.createdAt, scene: s.scenes.name, sceneSlug: s.scenes.slug, author: s.creatorProfiles.displayName })
    .from(s.opportunities).innerJoin(s.scenes, eq(s.scenes.id, s.opportunities.sceneId)).innerJoin(s.creatorProfiles, eq(s.creatorProfiles.id, s.opportunities.authorId))
    .where(and(inArray(s.opportunities.sceneId, sceneIds), eq(s.opportunities.status, "open"), sql`${s.opportunities.createdAt} > now() - interval '14 days'`, sql`${s.opportunities.authorId} <> ${me.id}`))
    .orderBy(desc(s.opportunities.createdAt)).limit(5) : [];

  const todo = invites.length + pendingCredits.length + toReview.length + connReqs.length + (unread ? 1 : 0);
  const hour = new Date().getHours();
  const greet = hour < 5 ? "Late one" : hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  return (
    <div>
      {welcome && (
        <div className="mb-8 rounded-2xl border border-signal/50 bg-surface p-5">
          <p className="display text-3xl">You're set up.</p>
          <p className="mt-1 max-w-[65ch] text-muted">This is your Radar — people, open calls and projects picked for what you do and what you're looking for. It changes as you work with people.</p>
        </div>
      )}

      <header className="mb-10">
        <h1 className="display text-[48px] leading-none sm:text-[72px]">{greet}, {me.displayName.split(" ")[0]}.</h1>
        <p className="mt-3 text-lg text-muted">
          {todo ? `${plural(todo, "thing")} need${todo === 1 ? "s" : ""} you, and ` : ""}{callsForMe.length ? `${plural(callsForMe.length, "open call")} fit${callsForMe.length === 1 ? "s" : ""} what you do.` : "here's who to meet today."}
        </p>
      </header>

      {/* ── Needs you ─────────────────────────────── */}
      {todo > 0 && (
        <section className="mb-14">
          <h2 className="sr-only">Needs you</h2>
          <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl bg-surface">
            {invites.map((i) => (
              <Row key={i.projectId} art={<Artwork seed={i.artSeed} url={i.artworkUrl} className="size-12 rounded-lg" />}
                text={<><span className="font-medium">{i.owner}</span> invited you to <Link href={`/projects/${i.slug}`} className="underline-offset-4 hover:underline">{i.title}</Link> as {i.role}</>}>
                <form action={respondInvite} className="flex gap-2">
                  <input type="hidden" name="projectId" value={i.projectId} />
                  <button name="accept" value="1" className="btn-primary btn-sm">Join</button>
                  <button name="accept" value="0" className="btn-quiet btn-sm">Decline</button>
                </form>
              </Row>
            ))}
            {pendingCredits.map((c) => (
              <Row key={c.id} art={<Artwork seed={c.artSeed} url={c.artworkUrl} className="size-12 rounded-lg" />}
                text={<>Confirm your credit on <Link href={`/projects/${c.slug}`} className="underline-offset-4 hover:underline">{c.title}</Link> — {c.role}</>}>
                <ConfirmCredit creditIds={[c.id]} label="Confirm" />
              </Row>
            ))}
            {toReview.map((o) => (
              <Row key={o.id} art={<Badge n={o.n} />} text={<>{plural(o.n, "application")} waiting on <span className="font-medium">{o.title}</span></>}>
                <Link href={`/opportunities/${o.id}`} className="btn-secondary btn-sm">Review</Link>
              </Row>
            ))}
            {connReqs.map((c) => (
              <Row key={c.id} art={<Avatar name={c.p.displayName} seed={c.p.avatarSeed} url={c.p.avatarUrl} size="md" />}
                text={<><Link href={`/u/${c.p.handle}`} className="font-medium hover:underline">{c.p.displayName}</Link> wants to connect · {c.p.city}</>}>
                <form action={respondConnection} className="flex gap-2">
                  <input type="hidden" name="connectionId" value={c.id} />
                  <button name="accept" value="1" className="btn-secondary btn-sm">Accept</button>
                  <button name="accept" value="0" className="btn-quiet btn-sm">Ignore</button>
                </form>
              </Row>
            ))}
            {unread > 0 && (
              <Row art={<Badge n={unread} />} text={<>{plural(unread, "conversation")} with new messages</>}>
                <Link href="/messages" className="btn-secondary btn-sm">Open</Link>
              </Row>
            )}
          </ul>
        </section>
      )}

      <div className="grid gap-14 lg:grid-cols-[1fr_340px]">
        <div className="space-y-14">
          <section>
            <SectionHead title="Open calls for you" href="/discover?tab=opportunities" />
            {callsForMe.length ? (
              <div className="grid gap-4 md:grid-cols-2">{callsForMe.map(({ o, m }) => <OpportunityCard key={o.id} o={o} match={m} />)}</div>
            ) : <Empty title="Nothing fits right now" action={{ href: "/discover?tab=opportunities", label: "Browse all open calls" }}>New calls that match your roles and genres will land here.</Empty>}
          </section>

          <section>
            <SectionHead title="People to meet" href="/discover" linkText="Discover more" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{people.map(({ p, m }) => <CreatorCard key={p.id} p={p} match={m} />)}</div>
          </section>
        </div>

        <aside className="space-y-12">
          <section>
            <h2 className="mb-4 font-medium">Your projects</h2>
            {activeProjects.length ? (
              <ul className="space-y-4">
                {activeProjects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.slug}`} className="group flex gap-3">
                      <Artwork seed={p.artSeed} url={p.artworkUrl} className="size-14 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="display truncate text-xl group-hover:underline">{p.title}</p>
                        <div className="mt-1 flex items-center gap-2"><StatusTag status={p.status} /><span className="text-[12px] text-muted">{myProjectIds.includes(p.id) ? "You're on it" : "Following"}</span></div>
                        <div className="mt-2 h-1 rounded-full bg-line"><div className="h-full rounded-full bg-signal" style={{ width: `${p.progress}%` }} /></div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <Empty title="No active projects" action={{ href: "/projects/new", label: "Start one" }} />}
          </section>

          {myApplied.length > 0 && (
            <section>
              <h2 className="mb-4 font-medium">Your applications</h2>
              <ul className="space-y-2 text-sm">
                {myApplied.map((o) => (
                  <li key={o.id} className="flex items-baseline justify-between gap-3">
                    <Link href={`/opportunities/${o.id}`} className="truncate hover:underline">{o.title}</Link>
                    <span className={`shrink-0 text-[12px] capitalize ${o.myApplication!.status === "shortlisted" ? "text-signal-text" : "text-muted"}`}>{o.myApplication!.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-4 font-medium">Collaborator activity</h2>
            {collabActivity.length ? (
              <ol className="space-y-4">
                {collabActivity.map(({ a, actor, project }) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <Avatar name={actor!.displayName} seed={actor!.avatarSeed} url={actor!.avatarUrl} size="sm" />
                    <p className="min-w-0">
                      <Link href={`/u/${actor!.handle}`} className="font-medium hover:underline">{actor!.displayName}</Link>{" "}
                      <span className="text-muted">on</span> <Link href={`/projects/${project.slug}`} className="hover:underline">{project.title}</Link>
                      <span className="block text-muted">{a.body} · {timeAgo(a.createdAt)}</span>
                    </p>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-muted">Connect with people to see what they're working on.</p>}
          </section>

          {sceneNews.length > 0 && (
            <section>
              <h2 className="mb-4 font-medium">In your scenes</h2>
              <ul className="space-y-3 text-sm">
                {sceneNews.map((n) => (
                  <li key={n.id}>
                    <Link href={`/opportunities/${n.id}`} className="hover:underline">{n.title}</Link>
                    <span className="block text-[13px] text-muted">{n.author} in <Link href={`/scenes/${n.sceneSlug}`} className="hover:text-text">{n.scene}</Link> · {timeAgo(n.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ art, text, children }: { art: React.ReactNode; text: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-4 p-4">
      <span className="shrink-0">{art}</span>
      <p className="min-w-[200px] flex-1">{text}</p>
      {children}
    </li>
  );
}

function Badge({ n }: { n: number }) {
  return <span className="display grid size-12 place-items-center rounded-lg bg-raised text-2xl text-signal-text">{n}</span>;
}
