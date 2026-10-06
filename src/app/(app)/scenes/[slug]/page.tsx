import { notFound } from "next/navigation";
import { eq, sql, and } from "drizzle-orm";
import { requireProfile } from "@/lib/auth";
import { loadProfiles } from "@/lib/profiles";
import { loadOpportunities, loadProjects, openNow } from "@/lib/work";
import { matchCreator, matchOpportunity } from "@/lib/match";
import { db } from "@/db";
import * as s from "@/db/schema";
import { Artwork } from "@/components/Artwork";
import { CreatorCard, OpportunityCard, ProjectCard } from "@/components/cards";
import { Empty, SectionHead } from "@/components/bits";
import { toggleScene } from "@/app/actions/scenes";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const [sc] = await db.select().from(s.scenes).where(eq(s.scenes.slug, (await params).slug));
  return { title: sc?.name ?? "Scene" };
}

export default async function ScenePage({ params }: { params: Promise<{ slug: string }> }) {
  const { profile } = await requireProfile();
  const [sc] = await db.select().from(s.scenes).where(eq(s.scenes.slug, (await params).slug));
  if (!sc) notFound();

  // Scene content = anything posted into the scene, plus anything that fits its genre (and city, for city scenes).
  const fits = (genreCol: string, cityCol: string) => !sc.genreId ? sql`false`
    : sc.city ? sql`${sql.raw(genreCol)} = ${sc.genreId} and ${sql.raw(cityCol)} = ${sc.city}`
    : sql`${sql.raw(genreCol)} = ${sc.genreId}`;
  const memberIds = (await db.select({ id: s.sceneMembers.profileId }).from(s.sceneMembers).where(eq(s.sceneMembers.sceneId, sc.id))).map((r) => r.id);
  const isMember = memberIds.includes(profile.id);

  const [people, opps, projects] = await Promise.all([
    loadProfiles([profile.id, ...memberIds.filter((x) => x !== profile.id)]),
    loadOpportunities(and(openNow, sql`(${s.opportunities.sceneId} = ${sc.id} or exists (select 1 from opportunity_genres og join creator_profiles a on a.id = ${s.opportunities.authorId} where og.opportunity_id = ${s.opportunities.id} and ${fits("og.genre_id", "a.city")}))`), profile.id, 12),
    loadProjects(sql`(${s.projects.sceneId} = ${sc.id} or exists (select 1 from creator_profiles o where o.id = ${s.projects.ownerId} and ${fits("projects.genre_id", "o.city")}))`, { limit: 8 }),
  ]);
  const me = people[0];
  const members = people.slice(1).map((p) => ({ p, m: matchCreator(me, p) })).sort((a, b) => b.m.score - a.m.score);

  return (
    <div>
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <Artwork seed={sc.artSeed} className="size-32 rounded-2xl sm:size-44" />
        <div className="flex-1">
          <p className="text-sm text-muted">{sc.kind === "city" ? `City scene · ${sc.city}` : sc.kind === "genre" ? "Genre scene" : "Community"}</p>
          <h1 className="display mt-1 text-[48px] sm:text-[72px]">{sc.name}</h1>
          <p className="mt-2 max-w-[62ch] text-muted">{sc.description}</p>
        </div>
        <form action={toggleScene}>
          <input type="hidden" name="sceneId" value={sc.id} />
          <input type="hidden" name="member" value={isMember ? "1" : "0"} />
          <button className={isMember ? "btn-secondary" : "btn-primary"}>{isMember ? "Leave scene" : "Join scene"}</button>
        </form>
      </header>

      <section className="mt-14">
        <SectionHead title="Open calls" sub={`What people in ${sc.name} need right now`} />
        {opps.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{opps.map((o) => <OpportunityCard key={o.id} o={o} match={o.authorId === me.id ? undefined : matchOpportunity(me, o)} />)}</div>
          : <Empty title="No open calls in this scene" action={{ href: "/opportunities/new", label: "Post the first one" }} />}
      </section>

      <section className="mt-14">
        <SectionHead title="Projects" />
        {projects.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">{projects.map((p) => <ProjectCard key={p.id} p={p} />)}</div> : <Empty title="No projects yet" />}
      </section>

      <section className="mt-14">
        <SectionHead title="Creators" sub={`${memberIds.length} in this scene, best matches for you first`} />
        {members.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{members.map(({ p, m }) => <CreatorCard key={p.id} p={p} match={m} />)}</div> : <Empty title="Be the first to join" />}
      </section>
    </div>
  );
}
