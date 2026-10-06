import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { getViewer } from "@/lib/auth";
import { creditsForProject, loadOpportunities, openNow } from "@/lib/work";
import { db, exec } from "@/db";
import * as s from "@/db/schema";
import { Wordmark } from "@/components/Nav";
import { Artwork } from "@/components/Artwork";
import { PlayButton } from "@/components/Player";
import { OpportunitySpec } from "@/components/cards";
import { categoryName } from "@/lib/taxonomy";

export default async function Landing() {
  const v = await getViewer();
  if (v?.profile?.onboardedAt) redirect("/radar");
  if (v) redirect("/onboarding");

  const [project] = await db.select().from(s.projects).where(eq(s.projects.slug, "midnight-signals"));
  const credits = project ? await creditsForProject(project.id) : [];
  const calls = await loadOpportunities(openNow, undefined, 3);
  const [{ n: creators }] = await exec<{ n: number }>(sql`select count(*)::int as n from creator_profiles where onboarded_at is not null`);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-quiet">Log in</Link>
          <Link href="/signup" className="btn-primary">Join</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero: the thing this world runs on — the credits on a record. */}
        <section className="grid items-center gap-12 py-12 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <h1 className="display text-[56px] sm:text-[88px]">Who's the right person for your next track?</h1>
            <p className="mt-6 max-w-[52ch] text-lg text-muted">
              Session is where producers, vocalists, writers, DJs and engineers find each other, make the record, and get the credit. No follower counts. Your reputation is the work you've finished with other people.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary h-12 px-6 text-base">Make your profile</Link>
              <Link href="/login" className="btn-secondary h-12 px-6 text-base">Try the demo</Link>
            </div>
          </div>

          {project && (
            <figure className="relative mx-auto w-full max-w-md">
              <div className="relative">
                <Artwork seed={project.artSeed} className="spin-in w-full rounded-2xl shadow-2xl" alt={`Artwork for ${project.title}`} />
                {project.demoUrl && <PlayButton src={project.demoUrl} title={project.title} by="Lewis Hart" size="lg" className="absolute bottom-4 right-4" />}
              </div>
              <figcaption className="relative z-10 -mt-10 ml-6 mr-[-8px] rounded-2xl border border-line bg-surface p-5 shadow-2xl sm:ml-16">
                <p className="display text-3xl">{project.title}</p>
                <ul className="mt-3 space-y-1">
                  {credits.map((c) => (
                    <li key={c.creditId} className="flex justify-between gap-6 text-[15px]"><span>{c.displayName}</span><span className="text-muted">{c.role}</span></li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-line-soft pt-3 text-[13px] text-muted">Met on Session. Every credit confirmed by the person named.</p>
              </figcaption>
            </figure>
          )}
        </section>

        <section className="border-t border-line-soft py-16">
          <h2 className="display max-w-[22ch] text-[40px] sm:text-[52px]">From a demo to a credit, in one place.</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Show what you make", "Your roles, your genres, three tracks you're proud of, and what you're looking for."],
              ["Find the right people", "Matches explain themselves — same genres, nearby, looking for exactly what you do."],
              ["Make it together", "Post an open call or start a project. Accept someone and they're on it."],
              ["Get the credit", "When it's done, everyone's credited. Confirmed credits become your track record."],
            ].map(([t, d], i) => (
              <li key={t}>
                <span className="display text-5xl text-signal-text">{i + 1}</span>
                <p className="mt-2 font-medium">{t}</p>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {calls.length > 0 && (
          <section className="border-t border-line-soft py-16">
            <div className="flex items-end justify-between gap-4">
              <h2 className="display text-[40px] sm:text-[52px]">Open right now</h2>
              <p className="text-sm text-muted">{creators} creators, and growing</p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {calls.map((o) => (
                <div key={o.id} className="panel p-5">
                  <p className="text-[13px] font-medium text-signal-text">{categoryName(o.category)}</p>
                  <p className="display mt-1 text-2xl leading-tight">{o.title}</p>
                  <p className="mb-4 mt-1 text-sm text-muted">{o.author.displayName} · {o.author.city}</p>
                  <OpportunitySpec o={o} dense />
                </div>
              ))}
            </div>
            <Link href="/signup" className="btn-primary mt-8">Join to apply</Link>
          </section>
        )}
      </main>
      <footer className="mx-auto max-w-6xl border-t border-line-soft px-4 py-8 text-sm text-faint sm:px-6">Session · for people who make music with other people</footer>
    </div>
  );
}
