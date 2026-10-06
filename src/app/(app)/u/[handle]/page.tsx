import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { requireProfile } from "@/lib/auth";
import { loadProfileByHandle, loadProfiles, collaboratorsOf, connectionBetween } from "@/lib/profiles";
import { creditsForProfile, loadProjects } from "@/lib/work";
import { matchCreator } from "@/lib/match";
import { LOOKING_FOR } from "@/lib/taxonomy";
import { db } from "@/db";
import * as s from "@/db/schema";
import { Avatar } from "@/components/Avatar";
import { Artwork } from "@/components/Artwork";
import { PlayButton } from "@/components/Player";
import { Availability, CheckIcon, Empty, StatusTag } from "@/components/bits";
import { connect, messageCreator, inviteToProject } from "@/app/actions/social";
import { setAvailability } from "@/app/actions/profile";
import { ConfirmCredit } from "@/components/ConfirmCredit";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const p = await loadProfileByHandle((await params).handle);
  return { title: p?.displayName ?? "Creator" };
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { profile: viewer } = await requireProfile();
  const p = await loadProfileByHandle((await params).handle);
  if (!p) notFound();
  const isMe = p.id === viewer.id;

  const [[me], credits, collaborators, conn, active, myProjects, scenes] = await Promise.all([
    loadProfiles([viewer.id]),
    creditsForProfile(p.id),
    collaboratorsOf(p.id),
    isMe ? null : connectionBetween(viewer.id, p.id),
    loadProjects(sql`${s.projects.status} in ('idea','recruiting','in_progress','mixing') and exists (select 1 from project_members m where m.project_id = ${s.projects.id} and m.profile_id = ${p.id} and m.status = 'active')`),
    isMe ? [] : db.select({ id: s.projects.id, title: s.projects.title }).from(s.projects)
      .where(and(eq(s.projects.ownerId, viewer.id), sql`${s.projects.status} in ('idea','recruiting','in_progress','mixing')`)),
    p.sceneIds.length ? db.select().from(s.scenes).where(inArray(s.scenes.id, p.sceneIds)) : [],
  ]);
  const match = isMe ? null : matchCreator(me, p);
  const sharedCredits = isMe ? [] : credits.filter((c) => c.with.some((w) => w.id === viewer.id));
  const skillGroups = Object.entries(p.skills.reduce<Record<string, string[]>>((acc, k) => ((acc[k.category] ??= []).push(k.name), acc), {}));

  return (
    <article>
      {/* ── Who are you? ─────────────────────────────── */}
      <header className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex items-start gap-5">
            <Avatar name={p.displayName} seed={p.avatarSeed} url={p.avatarUrl} size="xl" />
            <div className="min-w-0 pt-1">
              <p className="text-sm text-muted">@{p.handle}</p>
              <h1 className="display text-[48px] sm:text-[76px]">{p.displayName}</h1>
              <p className="mt-2 text-lg">{p.roles.map((r) => r.name).join(", ")}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            <Availability value={p.availability} />
            <span>{p.city}{p.country ? `, ${p.country}` : ""}</span>
            <span>{p.remote ? "Works remotely" : "In-person only"}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {p.genres.map((g) => <Link key={g.slug} href={`/discover?genre=${g.slug}`} className="chip hover:text-text">{g.name}</Link>)}
          </div>
          {p.bio && <p className="mt-6 max-w-[62ch] text-[17px] leading-relaxed">{p.bio}</p>}

          <div className="mt-8 flex flex-wrap gap-2">
            {isMe ? (
              <>
                <Link href="/profile/edit" className="btn-secondary">Edit profile</Link>
                <form action={setAvailability} className="flex items-center gap-1 rounded-full border border-line p-1">
                  {(["available", "selective", "busy"] as const).map((a) => (
                    <button key={a} name="availability" value={a} className={`h-8 rounded-full px-3 text-[13px] capitalize ${p.availability === a ? "bg-raised text-text" : "text-muted hover:text-text"}`}>{a}</button>
                  ))}
                </form>
              </>
            ) : (
              <>
                <form action={messageCreator}><input type="hidden" name="profileId" value={p.id} /><button className="btn-primary">Message</button></form>
                {myProjects.length > 0 && (
                  <details className="relative">
                    <summary className="btn-secondary cursor-pointer list-none">Invite to project</summary>
                    <form action={inviteToProject} className="absolute left-0 top-12 z-20 w-[min(340px,85vw)] space-y-3 rounded-2xl border border-line bg-raised p-4 shadow-2xl">
                      <input type="hidden" name="profileId" value={p.id} />
                      <div><label className="label" htmlFor="inv-p">Project</label>
                        <select id="inv-p" name="projectId" className="field">{myProjects.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select></div>
                      <div><label className="label" htmlFor="inv-r">Their role</label>
                        <input id="inv-r" name="role" className="field" defaultValue={p.roles[0]?.name.replace("Singer / ", "")} /></div>
                      <div><label className="label" htmlFor="inv-n">Note (optional)</label>
                        <textarea id="inv-n" name="note" rows={2} className="field" placeholder="Why you thought of them" /></div>
                      <button className="btn-primary w-full">Send invite</button>
                    </form>
                  </details>
                )}
                <ConnectButton state={conn ? (conn.status === "accepted" ? "connected" : conn.requesterId === viewer.id ? (conn.status === "pending" ? "requested" : "none") : conn.status === "pending" ? "incoming" : "none") : "none"} profileId={p.id} />
              </>
            )}
          </div>
        </div>

        {/* ── Should I work with this person? ───────────── */}
        <aside className="space-y-4">
          {match && (
            <div className="panel p-5">
              <p className="text-[13px] text-muted">For you</p>
              <p className={`display mt-1 text-3xl ${match.label === "Strong match" ? "text-signal-text" : ""}`}>{match.label}</p>
              {match.reasons.length > 0 && <ul className="mt-3 space-y-1.5 text-sm">{match.reasons.map((r) => <li key={r} className="flex gap-2"><span className="text-signal-text">✓</span>{r.charAt(0).toUpperCase() + r.slice(1)}</li>)}</ul>}
              {sharedCredits.length > 0 && <p className="mt-3 border-t border-line-soft pt-3 text-sm text-muted">You've worked together on {sharedCredits.map((c) => c.project.title).join(", ")}.</p>}
            </div>
          )}
          <div className="panel p-5">
            <p className="text-[13px] text-muted">Track record</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[["Projects completed", p.stats.completed], ["Collaborators", p.stats.unique], ["Worked with again", p.stats.repeat]].map(([k, v]) => (
                <div key={k as string}><dd className="display text-4xl">{v}</dd><dt className="mt-1 text-[12px] leading-tight text-muted">{k}</dt></div>
              ))}
            </dl>
            <p className="mt-4 flex items-start gap-2 border-t border-line-soft pt-3 text-[13px] text-muted">
              <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-ok" />
              Counted only from credits every collaborator on the project has confirmed.
            </p>
          </div>
          {p.lookingFor.length > 0 && (
            <div className="panel p-5">
              <p className="text-[13px] text-muted">Looking for</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.lookingFor.map((l) => <span key={l} className="chip border-signal/50 text-text">{LOOKING_FOR.find((x) => x.slug === l)?.name ?? l}</span>)}
              </div>
            </div>
          )}
        </aside>
      </header>

      {/* ── What do you make? ─────────────────────────── */}
      <section className="mt-16">
        <h2 className="section-title mb-6">Featured work</h2>
        {p.samples.length ? (
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {p.samples.map((w, i) => (
              <figure key={w.id}>
                <div className={`relative ${i === 0 ? "spin-in" : ""}`}>
                  <Artwork seed={w.artSeed} url={w.artworkUrl} alt={`Artwork for ${w.title}`} className="w-full rounded-xl" />
                  {w.audioUrl && <PlayButton src={w.audioUrl} title={w.title} by={p.displayName} size="lg" className="absolute bottom-3 right-3" />}
                </div>
                <figcaption className="mt-3">
                  <p className="display text-2xl">{w.title}</p>
                  <p className="mt-0.5 text-sm"><span className="text-signal-text">{w.creditRole}</span>{w.genre && <span className="text-muted"> · {w.genre}</span>}</p>
                  {(w.collaborators.length > 0 || w.collaboratorNote) && (
                    <p className="mt-1 text-[13px] text-muted">
                      with {w.collaborators.map((c, k) => <span key={c.handle}>{k > 0 && ", "}<Link href={`/u/${c.handle}`} className="hover:text-text hover:underline">{c.displayName}</Link></span>)}
                      {w.collaboratorNote && <>{w.collaborators.length ? " · " : ""}{w.collaboratorNote}</>}
                    </p>
                  )}
                  {w.externalUrl && <a href={w.externalUrl} target="_blank" rel="noreferrer noopener" className="link mt-1 inline-block text-[13px]">Listen elsewhere ↗</a>}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : <Empty title="No work added yet" />}
      </section>

      {/* ── What are you good at? ─────────────────────── */}
      {skillGroups.length > 0 && (
        <section className="mt-16">
          <h2 className="section-title mb-6">Skills</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {skillGroups.map(([cat, names]) => (
              <div key={cat} className="rounded-2xl border border-line p-5">
                <p className="font-medium">{cat}</p>
                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">{names.map((n) => <li key={n}>{n}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Credits (liner notes) ─────────────────────── */}
      <section className="mt-16 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div>
          <h2 className="section-title mb-6">Credits</h2>
          {credits.length ? (
            <ol className="divide-y divide-line-soft border-y border-line-soft">
              {credits.map((c) => (
                <li key={c.project.id} className="flex gap-4 py-5">
                  <Link href={`/projects/${c.project.slug}`} className="shrink-0"><Artwork seed={c.project.artSeed} url={c.project.artworkUrl} className="size-16 rounded-lg sm:size-20" /></Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <Link href={`/projects/${c.project.slug}`} className="display text-2xl hover:underline">{c.project.title}</Link>
                      <span className="text-sm text-signal-text">{c.roles.join(", ")}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {c.with.map((w, k) => <span key={w.id + w.role}>{k > 0 && " · "}<Link href={`/u/${w.handle}`} className="hover:text-text">{w.displayName}</Link> — {w.role}</span>)}
                    </p>
                    <div className="mt-1.5 text-[13px]">
                      {c.confirmed
                        ? <span className="inline-flex items-center gap-1 text-ok"><CheckIcon /> Confirmed</span>
                        : isMe ? <ConfirmCredit creditIds={c.creditIds} /> : <span className="text-faint">Awaiting confirmation</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : <Empty title="No credits yet">Credits appear here when a project {isMe ? "you're on" : "they're on"} is finished.</Empty>}
        </div>
        <div className="space-y-10">
          {collaborators.length > 0 && (
            <div>
              <h3 className="mb-4 font-medium">Worked with</h3>
              <ul className="space-y-3">
                {collaborators.map((c) => (
                  <li key={c.id}><Link href={`/u/${c.handle}`} className="flex items-center gap-3 hover:text-signal-text">
                    <Avatar name={c.display_name} seed={c.avatar_seed} url={c.avatar_url} />
                    <span className="flex-1">{c.display_name}</span>
                    <span className="text-[13px] text-muted">{c.shared > 1 ? `${c.shared} projects` : "1 project"}</span>
                  </Link></li>
                ))}
              </ul>
            </div>
          )}
          {active.length > 0 && (
            <div>
              <h3 className="mb-4 font-medium">Working on now</h3>
              <ul className="space-y-3">{active.map((pr) => (
                <li key={pr.id}><Link href={`/projects/${pr.slug}`} className="flex items-center gap-3">
                  <Artwork seed={pr.artSeed} url={pr.artworkUrl} className="size-11 rounded-md" />
                  <span className="min-w-0 flex-1"><span className="block truncate">{pr.title}</span><span className="text-[13px] text-muted">{pr.genre?.name}</span></span>
                  <StatusTag status={pr.status} />
                </Link></li>
              ))}</ul>
            </div>
          )}
          {scenes.length > 0 && (
            <div>
              <h3 className="mb-4 font-medium">Scenes</h3>
              <div className="flex flex-wrap gap-1.5">{scenes.map((sc) => <Link key={sc.id} href={`/scenes/${sc.slug}`} className="chip hover:text-text">{sc.name}</Link>)}</div>
            </div>
          )}
        </div>
      </section>
    </article>
  );
}

function ConnectButton({ state, profileId }: { state: "none" | "requested" | "incoming" | "connected"; profileId: string }) {
  if (state === "connected") return <span className="btn-quiet pointer-events-none"><CheckIcon /> Connected</span>;
  if (state === "requested") return <span className="btn-quiet pointer-events-none">Request sent</span>;
  return (
    <form action={connect}>
      <input type="hidden" name="profileId" value={profileId} />
      <button className="btn-secondary">{state === "incoming" ? "Accept connection" : "Connect"}</button>
    </form>
  );
}
