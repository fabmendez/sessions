import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { requireProfile } from "@/lib/auth";
import { creditsForProject, loadOpportunities, loadProject, projectActivityFeed } from "@/lib/work";
import { PROJECT_STATUSES, categoryName } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/format";
import { db, exec } from "@/db";
import * as s from "@/db/schema";
import { Artwork } from "@/components/Artwork";
import { Avatar } from "@/components/Avatar";
import { PlayButton } from "@/components/Player";
import { OpportunitySpec } from "@/components/cards";
import { CheckIcon, StatusTag } from "@/components/bits";
import { ConfirmCredit } from "@/components/ConfirmCredit";
import { toggleFollow, updateProject, postProjectUpdate, issueCredits, setReleased } from "@/app/actions/projects";
import { respondInvite } from "@/app/actions/social";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await loadProject((await params).slug);
  return { title: p?.title ?? "Project" };
}

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ new?: string }> }) {
  const { profile } = await requireProfile();
  const p = await loadProject((await params).slug);
  if (!p) notFound();
  const isNew = (await searchParams).new;
  const isOwner = p.ownerId === profile.id;
  const meMember = p.members.find((m) => m.id === profile.id);
  const isMember = meMember?.status === "active";
  const invited = meMember?.status === "invited";
  const done = p.status === "finished" || p.status === "released";

  const [roles, credits, activity, [follow]] = await Promise.all([
    loadOpportunities(and(eq(s.opportunities.projectId, p.id), eq(s.opportunities.status, "open")), profile.id),
    creditsForProject(p.id),
    projectActivityFeed([p.id], 30),
    db.select().from(s.projectFollows).where(and(eq(s.projectFollows.projectId, p.id), eq(s.projectFollows.profileId, profile.id))),
  ]);
  const [{ n: followers }] = await exec<{ n: number }>(sql`select count(*)::int as n from project_follows where project_id = ${p.id}`);
  const myUnconfirmed = credits.filter((c) => c.id === profile.id && !c.confirmed);
  const stageIdx = PROJECT_STATUSES.findIndex((x) => x.slug === p.status);

  return (
    <div>
      {isNew && <p className="mb-6 rounded-xl border border-ok/40 px-4 py-3 text-sm text-ok">Your project is live. Next: post an open role or invite someone from their profile.</p>}

      {invited && (
        <div className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-signal/60 bg-surface p-5">
          <p className="flex-1"><span className="font-medium">{p.owner.displayName}</span> invited you to join as <span className="text-signal-text">{meMember!.role}</span>.</p>
          <form action={respondInvite} className="flex gap-2">
            <input type="hidden" name="projectId" value={p.id} />
            <button name="accept" value="1" className="btn-primary">Join project</button>
            <button name="accept" value="0" className="btn-quiet">Decline</button>
          </form>
        </div>
      )}

      {/* ── What is being made? ─────────────────────── */}
      <header className="grid gap-8 md:grid-cols-[minmax(0,420px)_1fr] md:items-end">
        <div className="relative">
          <Artwork seed={p.artSeed} url={p.artworkUrl} alt={`Artwork for ${p.title}`} className="w-full rounded-2xl shadow-2xl" />
          {p.demoUrl && <PlayButton src={p.demoUrl} title={p.title} by={p.owner.displayName} size="lg" className="absolute bottom-4 right-4" />}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3"><StatusTag status={p.status} />{p.genre && <span className="text-sm text-muted">{p.genre.name}</span>}</div>
          <h1 className="display mt-3 text-[52px] sm:text-[80px]">{p.title}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            <Avatar name={p.owner.displayName} seed={p.owner.avatarSeed} url={p.owner.avatarUrl} size="xs" />
            Run by <Link href={`/u/${p.owner.handle}`} className="text-text hover:underline">{p.owner.displayName}</Link>
            {p.scene && <> in <Link href={`/scenes/${p.scene.slug}`} className="text-text hover:underline">{p.scene.name}</Link></>}
          </p>
          {p.description && <p className="mt-5 max-w-[60ch] text-[17px] leading-relaxed">{p.description}</p>}

          <ol className="mt-6 flex flex-wrap gap-x-1 gap-y-2 text-[12px]" aria-label="Stage">
            {PROJECT_STATUSES.map((st, i) => (
              <li key={st.slug} className={`flex items-center gap-1 ${i === stageIdx ? "font-medium text-signal-text" : i < stageIdx ? "text-text" : "text-faint"}`}>
                {i > 0 && <span className="h-px w-4 bg-line" aria-hidden />}
                <span aria-current={i === stageIdx ? "step" : undefined}>{st.name}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {!isMember && !invited && roles.length > 0 && <a href="#open-roles" className="btn-primary">See open roles ({roles.length})</a>}
            {!isOwner && (
              <form action={toggleFollow}>
                <input type="hidden" name="projectId" value={p.id} />
                <input type="hidden" name="following" value={follow ? "1" : "0"} />
                <button className="btn-secondary">{follow ? "Following" : "Follow project"}</button>
              </form>
            )}
            {isOwner && !done && <Link href={`/opportunities/new?project=${p.id}`} className="btn-primary">Post an open role</Link>}
            <span className="text-[13px] text-faint">{followers > 0 ? `${followers} following the work` : ""}</span>
          </div>
        </div>
      </header>

      <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_360px]">
        <div className="space-y-14">
          {/* ── How can I participate? ─────────────── */}
          {roles.length > 0 && (
            <section id="open-roles" className="scroll-mt-24">
              <h2 className="section-title mb-5">Open roles</h2>
              <ul className="space-y-3">
                {roles.map((o) => (
                  <li key={o.id}>
                    <Link href={`/opportunities/${o.id}`} className="block rounded-2xl border border-line p-5 hover:border-signal">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="display text-2xl">{categoryName(o.category)}</p>
                        <span className="text-sm text-signal-text">{o.myApplication ? "Applied" : isOwner ? `${o.applicationCount} applied` : "Apply"}</span>
                      </div>
                      <p className="mb-4 mt-1 text-sm text-muted">{o.lookingFor}{o.style ? ` — ${o.style}` : ""}</p>
                      <OpportunitySpec o={o} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {credits.length > 0 && (
            <section>
              <h2 className="section-title mb-5">Credits</h2>
              <div className="rounded-2xl bg-surface p-6 sm:p-8">
                <p className="display text-3xl">{p.title}</p>
                <ul className="mt-5 space-y-2.5">
                  {credits.map((c) => (
                    <li key={c.creditId} className="flex flex-wrap items-baseline gap-x-3">
                      <Link href={`/u/${c.handle}`} className="display text-2xl hover:underline">{c.displayName}</Link>
                      <span className="text-muted">— {c.role}</span>
                      {c.confirmed ? <CheckIcon className="size-3.5 text-ok" /> : <span className="text-[12px] text-faint">awaiting confirmation</span>}
                    </li>
                  ))}
                </ul>
                {myUnconfirmed.length > 0 && (
                  <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                    <p className="flex-1 text-sm">Is this right? Confirming adds it to your profile and your track record.</p>
                    <ConfirmCredit creditIds={myUnconfirmed.map((c) => c.creditId)} label="Confirm my credit" />
                  </div>
                )}
              </div>
            </section>
          )}

          <section>
            <h2 className="section-title mb-5">Activity</h2>
            {isMember && !done && (
              <form action={postProjectUpdate} className="mb-6 rounded-2xl border border-line p-4" encType="multipart/form-data">
                <input type="hidden" name="projectId" value={p.id} />
                <label htmlFor="update" className="sr-only">Post an update</label>
                <textarea id="update" name="body" rows={2} maxLength={500} className="w-full resize-none bg-transparent focus:outline-none" placeholder="Share progress — a new bounce, a decision, what's next" />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <input name="demo" type="file" accept="audio/*" aria-label="Attach a new demo" className="min-w-0 text-[13px] text-muted file:mr-2 file:rounded-full file:border-0 file:bg-raised file:px-3 file:py-1 file:text-text" />
                  <button className="btn-secondary btn-sm">Post update</button>
                </div>
              </form>
            )}
            <ol className="space-y-5 border-l border-line pl-5">
              {activity.map(({ a, actor }) => (
                <li key={a.id} className="relative">
                  <span className={`absolute -left-[25px] top-1.5 size-2.5 rounded-full ${a.kind === "credits" || a.kind === "joined" ? "bg-signal" : "bg-line"}`} aria-hidden />
                  <p className="text-sm"><span className="font-medium">{actor?.displayName ?? "Someone"}</span> <span className="text-muted">· {timeAgo(a.createdAt)}</span></p>
                  <p className="mt-0.5">{a.body}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-8">
          <section>
            <h2 className="mb-4 font-medium">Who's on it</h2>
            <ul className="space-y-3">
              {p.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.displayName} seed={m.avatarSeed} url={m.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/u/${m.handle}`} className="hover:underline">{m.displayName}</Link>
                    <p className="text-[13px] text-muted">{m.role}{m.id === p.ownerId ? " · runs it" : ""}</p>
                  </div>
                  {m.status === "invited" && <span className="text-[12px] text-faint">invited</span>}
                </li>
              ))}
              {roles.map((o) => (
                <li key={o.id} className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full border border-dashed border-signal text-signal-text" aria-hidden>+</span>
                  <Link href={`/opportunities/${o.id}`} className="text-sm text-signal-text hover:underline">{categoryName(o.category).replace(" wanted", "")} — open</Link>
                </li>
              ))}
            </ul>
          </section>

          {isOwner && !done && (
            <section className="panel space-y-6 p-5">
              <h2 className="font-medium">Manage</h2>
              <form action={updateProject} className="space-y-3">
                <input type="hidden" name="projectId" value={p.id} />
                <div><label className="label" htmlFor="status">Stage</label>
                  <select id="status" name="status" defaultValue={p.status} className="field">
                    {PROJECT_STATUSES.filter((x) => !["finished", "released"].includes(x.slug)).map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
                  </select></div>
                <div><label className="label" htmlFor="progress">Progress — {p.progress}%</label>
                  <input id="progress" name="progress" type="range" min={0} max={100} step={5} defaultValue={p.progress} className="w-full accent-[var(--signal)]" /></div>
                <button className="btn-secondary btn-sm">Save</button>
              </form>
              <details className="border-t border-line pt-5">
                <summary className="cursor-pointer font-medium">Finish and issue credits</summary>
                <form action={issueCredits} className="mt-4 space-y-3">
                  <input type="hidden" name="projectId" value={p.id} />
                  <p className="text-[13px] text-muted">Everyone below gets a credit on their profile once they confirm it. Adjust the wording first.</p>
                  {p.members.filter((m) => m.status === "active").map((m) => (
                    <div key={m.id} className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <label className="text-sm" htmlFor={`role_${m.id}`}>{m.displayName}</label>
                      <label className="text-[12px] text-faint"><input type="checkbox" name={`omit_${m.id}`} className="mr-1" />leave off</label>
                      <input id={`role_${m.id}`} name={`role_${m.id}`} defaultValue={m.role} className="field col-span-2 py-1.5" />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <button name="status" value="finished" className="btn-primary btn-sm">Mark finished</button>
                    <button name="status" value="released" className="btn-secondary btn-sm">Mark released</button>
                  </div>
                </form>
              </details>
            </section>
          )}
          {isOwner && p.status === "finished" && (
            <form action={setReleased} className="panel p-5">
              <input type="hidden" name="projectId" value={p.id} />
              <p className="text-sm text-muted">Out in the world?</p>
              <button className="btn-secondary btn-sm mt-3">Mark as released</button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
