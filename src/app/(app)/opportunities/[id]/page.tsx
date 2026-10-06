import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, desc } from "drizzle-orm";
import { requireProfile } from "@/lib/auth";
import { loadOpportunities } from "@/lib/work";
import { loadProfiles } from "@/lib/profiles";
import { matchOpportunity } from "@/lib/match";
import { categoryName } from "@/lib/taxonomy";
import { money, timeAgo, plural } from "@/lib/format";
import { db } from "@/db";
import * as s from "@/db/schema";
import { Avatar } from "@/components/Avatar";
import { Artwork } from "@/components/Artwork";
import { PlayButton } from "@/components/Player";
import { OpportunitySpec } from "@/components/cards";
import { Availability, TrustBadges, CheckIcon } from "@/components/bits";
import { ApplyForm } from "@/components/ApplyForm";
import { reviewApplication, withdrawApplication, closeOpportunity } from "@/app/actions/opportunities";
import { messageCreator } from "@/app/actions/social";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const [o] = await db.select({ title: s.opportunities.title }).from(s.opportunities).where(eq(s.opportunities.id, (await params).id));
  return { title: o?.title ?? "Open call" };
}

export default async function OpportunityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ posted?: string }> }) {
  const { id } = await params;
  const { posted } = await searchParams;
  const { profile } = await requireProfile();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [o] = await loadOpportunities(eq(s.opportunities.id, id), profile.id, 1);
  if (!o) notFound();
  const isAuthor = o.authorId === profile.id;
  const [me, author] = await loadProfiles([profile.id, o.authorId]).then((l) => [l.find((x) => x.id === profile.id)!, l.find((x) => x.id === o.authorId)!]);
  const match = isAuthor ? null : matchOpportunity(me, o);
  const open = o.status === "open" && (!o.deadline || o.deadline.getTime() > Date.now());

  const applications = isAuthor
    ? await db.select({ a: s.opportunityApplications, w: s.workSamples }).from(s.opportunityApplications)
        .leftJoin(s.workSamples, eq(s.workSamples.id, s.opportunityApplications.workSampleId))
        .where(eq(s.opportunityApplications.opportunityId, o.id)).orderBy(desc(s.opportunityApplications.createdAt))
    : [];
  const applicants = await loadProfiles(applications.map((x) => x.a.applicantId));
  const myApp = o.myApplication
    ? (await db.select().from(s.opportunityApplications).where(and(eq(s.opportunityApplications.id, o.myApplication.id))))[0]
    : null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <article>
        {posted && <p className="mb-6 rounded-xl border border-ok/40 px-4 py-3 text-sm text-ok">Posted. It's now showing on the Radar of creators who match.</p>}
        <p className="text-sm font-medium text-signal-text">{categoryName(o.category)}{o.status !== "open" && <span className="ml-2 text-muted">· {o.status === "filled" ? "Filled" : "Closed"}</span>}</p>
        <h1 className="display mt-2 text-[44px] sm:text-[60px]">{o.title}</h1>
        <p className="mt-3 text-sm text-muted">Posted {timeAgo(o.createdAt)} · {plural(o.applicationCount, "applicant")}</p>

        <div className="mt-8 rounded-2xl border border-line p-5 sm:p-6"><OpportunitySpec o={o} /></div>

        <dl className="mt-8 divide-y divide-line-soft border-y border-line-soft">
          {[["Project", o.projectSummary], ["Looking for", o.lookingFor], ["Style", o.style]].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="grid gap-1 py-4 sm:grid-cols-[160px_1fr]">
              <dt className="text-sm text-muted">{k}</dt><dd className="text-[17px]">{v}</dd>
            </div>
          ))}
          {o.genres.length > 0 && (
            <div className="grid gap-1 py-4 sm:grid-cols-[160px_1fr]">
              <dt className="text-sm text-muted">Genres</dt>
              <dd className="flex flex-wrap gap-1.5">{o.genres.map((g) => <span key={g.slug} className="chip">{g.name}</span>)}</dd>
            </div>
          )}
        </dl>

        {(o.demoUrl || o.project) && (
          <div className="mt-8 flex items-center gap-4 rounded-2xl bg-surface p-4">
            <Artwork seed={o.project?.artSeed ?? o.title.length * 97} url={o.project?.artworkUrl} className="size-20 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-muted">{o.demoUrl ? "Demo" : "Project"}</p>
              <p className="display truncate text-2xl">{o.project?.title ?? o.projectSummary}</p>
              {o.project && <Link href={`/projects/${o.project.slug}`} className="link text-sm">Open the project</Link>}
            </div>
            {o.demoUrl && <PlayButton src={o.demoUrl} title={o.project?.title ?? o.title} by={o.author.displayName} size="lg" />}
          </div>
        )}

        <section className="mt-10">
          <h2 className="mb-4 font-medium">Who's asking</h2>
          <div className="flex items-start gap-4">
            <Avatar name={author.displayName} seed={author.avatarSeed} url={author.avatarUrl} size="md" />
            <div className="min-w-0">
              <Link href={`/u/${author.handle}`} className="display text-2xl hover:underline">{author.displayName}</Link>
              <p className="text-sm">{author.roles.map((r) => r.name).join(", ")} · {author.city}</p>
              <div className="mt-2"><TrustBadges stats={author.stats} compact /></div>
              <div className="mt-1"><Availability value={author.availability} /></div>
            </div>
          </div>
        </section>
      </article>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        {isAuthor ? (
          <div className="panel p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="display text-3xl">Applicants</h2>
              {o.status === "open" && <form action={closeOpportunity}><input type="hidden" name="opportunityId" value={o.id} /><button className="btn-quiet btn-sm">Close call</button></form>}
            </div>
            {applications.length === 0 && <p className="mt-3 text-sm text-muted">No applications yet. Creators who match will see this on their Radar.</p>}
            <ul className="mt-4 space-y-4">
              {applications.map(({ a, w }) => {
                const p = applicants.find((x) => x.id === a.applicantId)!;
                return (
                  <li key={a.id} className="rounded-xl bg-raised p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.displayName} seed={p.avatarSeed} url={p.avatarUrl} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/u/${p.handle}`} className="font-medium hover:underline">{p.displayName}</Link>
                        <p className="truncate text-[12px] text-muted">{p.roles[0]?.name} · {p.city} · {p.stats.completed} completed</p>
                      </div>
                      <span className={`text-[12px] capitalize ${a.status === "accepted" ? "text-ok" : a.status === "shortlisted" ? "text-signal-text" : a.status === "declined" ? "text-faint" : "text-muted"}`}>{a.status}</span>
                    </div>
                    <p className="mt-3 text-sm">{a.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                      {a.proposedFee != null && <span className="font-mono text-text">{a.proposedFee === 0 ? "No fee" : money(a.proposedFee, o.currency)}</span>}
                      {w && <span className="inline-flex items-center gap-2">{w.audioUrl && <PlayButton src={w.audioUrl} title={w.title} by={p.displayName} size="sm" />}{w.title}</span>}
                    </div>
                    {a.status !== "accepted" && a.status !== "declined" && o.status === "open" && (
                      <form action={reviewApplication} className="mt-3 flex flex-wrap gap-2">
                        <input type="hidden" name="applicationId" value={a.id} />
                        <button name="status" value="accepted" className="btn-primary btn-sm">{o.projectId ? "Accept and add to project" : "Accept"}</button>
                        {a.status !== "shortlisted" && <button name="status" value="shortlisted" className="btn-secondary btn-sm">Shortlist</button>}
                        <button name="status" value="declined" className="btn-quiet btn-sm">Decline</button>
                      </form>
                    )}
                    <form action={messageCreator} className="mt-2"><input type="hidden" name="profileId" value={p.id} /><button className="link text-[13px]">Message {p.displayName.split(" ")[0]}</button></form>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <>
            {match && (
              <div className="panel p-5">
                <p className="text-[13px] text-muted">For you</p>
                <p className={`display mt-1 text-3xl ${match.label === "Strong match" ? "text-signal-text" : ""}`}>{match.label}</p>
                {match.reasons.length > 0 && <ul className="mt-3 space-y-1.5 text-sm">{match.reasons.map((r) => <li key={r} className="flex gap-2"><span className="text-signal-text">✓</span>{r.charAt(0).toUpperCase() + r.slice(1)}</li>)}</ul>}
              </div>
            )}
            <div className="panel p-5">
              {myApp ? (
                <>
                  <p className="flex items-center gap-2 font-medium text-ok"><CheckIcon /> You applied {timeAgo(myApp.createdAt)}</p>
                  <p className="mt-1 text-sm text-muted">Status: <span className="capitalize text-text">{myApp.status}</span></p>
                  <p className="mt-3 rounded-lg bg-raised p-3 text-sm">{myApp.message}</p>
                  {myApp.status === "pending" && <form action={withdrawApplication} className="mt-3"><input type="hidden" name="applicationId" value={myApp.id} /><button className="btn-quiet btn-sm">Withdraw</button></form>}
                </>
              ) : open ? (
                <>
                  <h2 className="display mb-4 text-3xl">Apply</h2>
                  <ApplyForm opportunityId={o.id} samples={me.samples.map((w) => ({ id: w.id, title: w.title, creditRole: w.creditRole }))} paid={o.paid} currency={o.currency} budget={o.budgetAmount} />
                </>
              ) : <p className="text-sm text-muted">This open call isn't taking applications any more.</p>}
            </div>
            <form action={messageCreator}>
              <input type="hidden" name="profileId" value={o.authorId} />
              <input type="hidden" name="attachKind" value="opportunity_link" />
              <input type="hidden" name="attachId" value={o.id} />
              <button className="btn-secondary w-full">Ask {o.author.displayName.split(" ")[0]} a question</button>
            </form>
          </>
        )}
      </aside>
    </div>
  );
}
