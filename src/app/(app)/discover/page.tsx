import Link from "next/link";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { requireProfile } from "@/lib/auth";
import { loadProfiles } from "@/lib/profiles";
import { loadOpportunities, loadProjects, openNow } from "@/lib/work";
import { matchCreator, matchOpportunity, distanceKm } from "@/lib/match";
import { taxonomyOptions } from "@/lib/options";
import { LOOKING_FOR, OPPORTUNITY_CATEGORIES, PROJECT_STATUSES } from "@/lib/taxonomy";
import { db } from "@/db";
import * as s from "@/db/schema";
import { CreatorCard, OpportunityCard, ProjectCard } from "@/components/cards";
import { Artwork } from "@/components/Artwork";
import { Empty } from "@/components/bits";
import { FilterForm, Select, Toggle } from "@/components/FilterForm";

export const metadata = { title: "Discover" };

type SP = Record<string, string | undefined>;
const TABS = [
  { slug: "people", label: "People" },
  { slug: "opportunities", label: "Open calls" },
  { slug: "projects", label: "Projects" },
  { slug: "scenes", label: "Scenes" },
];

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.slug === sp.tab) ? sp.tab! : "people";
  const { profile } = await requireProfile();
  const [me] = await loadProfiles([profile.id]);
  const opts = await taxonomyOptions();

  return (
    <div>
      <h1 className="display text-[44px] sm:text-[60px]">{tab === "people" ? "Who should you meet?" : tab === "opportunities" ? "What's worth applying for?" : tab === "projects" ? "What's being made?" : "Find your scene"}</h1>
      <nav className="-mx-4 mt-6 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Discover sections">
        {TABS.map((t) => (
          <Link key={t.slug} href={`/discover?tab=${t.slug}`} aria-current={t.slug === tab ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm ${t.slug === tab ? "bg-text text-bg" : "text-muted hover:bg-raised hover:text-text"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8">
        {tab === "people" && <People sp={sp} me={me} opts={opts} />}
        {tab === "opportunities" && <Opportunities sp={sp} me={me} opts={opts} />}
        {tab === "projects" && <Projects sp={sp} me={me} opts={opts} />}
        {tab === "scenes" && <Scenes meId={me.id} />}
      </div>
    </div>
  );
}

type Me = Awaited<ReturnType<typeof loadProfiles>>[number];
type Opts = Awaited<ReturnType<typeof taxonomyOptions>>;

async function People({ sp, me, opts }: { sp: SP; me: Me; opts: Opts }) {
  const P = s.creatorProfiles;
  const where: SQL[] = [sql`${P.onboardedAt} is not null`, sql`${P.id} <> ${me.id}`];
  if (sp.role) where.push(sql`exists (select 1 from profile_roles pr join roles r on r.id = pr.role_id where pr.profile_id = ${P.id} and r.slug = ${sp.role})`);
  if (sp.genre) where.push(sql`exists (select 1 from profile_genres pg join genres g on g.id = pg.genre_id where pg.profile_id = ${P.id} and g.slug = ${sp.genre})`);
  if (sp.skill) where.push(sql`exists (select 1 from profile_skills ps where ps.profile_id = ${P.id} and ps.skill_id = ${sp.skill})`);
  if (sp.availability) where.push(eq(P.availability, sp.availability as "available"));
  if (sp.where === "remote") where.push(eq(P.remote, true));
  if (sp.where === "local" && me.city) where.push(eq(P.city, me.city));
  if (sp.looking) where.push(sql`${sp.looking} = any(${P.lookingFor})`);
  if (sp.paid === "paid") where.push(sql`${P.lookingFor} && array['paid-work','session-work']::text[]`);
  if (sp.paid === "unpaid") where.push(sql`${P.lookingFor} && array['collaborations','networking','songwriting']::text[]`);
  if (sp.verified) where.push(sql`exists (select 1 from credits c where c.profile_id = ${P.id} and c.confirmed)`);
  if (sp.q) where.push(sql`(${P.displayName} ilike ${"%" + sp.q + "%"} or ${P.handle} ilike ${"%" + sp.q + "%"} or ${P.city} ilike ${"%" + sp.q + "%"})`);

  const ids = (await db.select({ id: P.id }).from(P).where(and(...where)).limit(500)).map((r) => r.id);
  const people = (await loadProfiles(ids)).map((p) => ({ p, m: matchCreator(me, p), km: distanceKm(me, p) }));
  const sort = sp.sort ?? "match";
  people.sort((a, b) =>
    sort === "recent" ? b.p.lastActiveAt.getTime() - a.p.lastActiveAt.getTime()
    : sort === "nearby" ? (a.km ?? 1e9) - (b.km ?? 1e9)
    : sort === "collaborated" ? b.p.stats.completed - a.p.stats.completed || b.p.stats.unique - a.p.stats.unique
    : sort === "new" ? b.p.createdAt.getTime() - a.p.createdAt.getTime()
    : b.m.score - a.m.score);

  return (
    <>
      <FilterForm key={JSON.stringify(sp)} tab="people" q={sp.q} placeholder="Search by name or city">
        <Select name="role" value={sp.role} label="Any role" options={opts.roles.map((r) => [r.slug, r.name])} />
        <Select name="genre" value={sp.genre} label="Any genre" options={opts.genres.map((g) => [g.slug, g.name])} />
        <Select name="where" value={sp.where} label="Anywhere" options={[["local", `In ${me.city ?? "my city"}`], ["remote", "Remote OK"]]} />
        <Select name="availability" value={sp.availability} label="Any availability" options={[["available", "Available"], ["selective", "Selective"], ["busy", "Busy"]]} />
        <Select name="paid" value={sp.paid} label="Paid or unpaid" options={[["paid", "Wants paid work"], ["unpaid", "Open to unpaid collabs"]]} />
        <Select name="looking" value={sp.looking} label="Any project type" options={LOOKING_FOR.filter((l) => ["collaborations", "session-work", "gigs", "remixes", "songwriting"].includes(l.slug)).map((l) => [l.slug, l.name])} />
        <Select name="skill" value={sp.skill} label="Any skill or software" groups={opts.skills.map((g) => [g.category, g.items.map((k) => [k.id, k.name] as [string, string])])} />
        <Toggle name="verified" checked={!!sp.verified} label="Has confirmed credits" />
        <Select name="sort" value={sp.sort} label="Best match" options={[["recent", "Recently active"], ["nearby", "Nearby"], ["collaborated", "Most collaborated"], ["new", "New creators"]]} sort />
      </FilterForm>
      <p className="mb-4 mt-6 text-sm text-muted">{people.length} creator{people.length === 1 ? "" : "s"}{sort === "match" ? ", best matches first" : ""}</p>
      {people.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{people.map(({ p, m }) => <CreatorCard key={p.id} p={p} match={m} />)}</div>
      ) : <Empty title="No one matches all of those filters" action={{ href: "/discover?tab=people", label: "Clear filters" }}>Try removing a filter or two — or post an open call and let people come to you.</Empty>}
    </>
  );
}

async function Opportunities({ sp, me, opts }: { sp: SP; me: Me; opts: Opts }) {
  const O = s.opportunities;
  const where: SQL[] = [openNow];
  if (sp.category) where.push(eq(O.category, sp.category as "vocalist"));
  if (sp.genre) where.push(sql`exists (select 1 from opportunity_genres og join genres g on g.id = og.genre_id where og.opportunity_id = ${O.id} and g.slug = ${sp.genre})`);
  if (sp.where === "remote") where.push(eq(O.remote, true));
  if (sp.where === "local" && me.city) where.push(sql`${O.remote} = false and ${O.city} = ${me.city}`);
  if (sp.paid === "paid") where.push(eq(O.paid, true));
  if (sp.paid === "unpaid") where.push(eq(O.paid, false));
  if (sp.mine) where.push(eq(O.authorId, me.id));
  const list = (await loadOpportunities(and(...where), me.id)).map((o) => ({ o, m: matchOpportunity(me, o) }));
  const sort = sp.sort ?? "match";
  list.sort((a, b) =>
    sort === "new" ? b.o.createdAt.getTime() - a.o.createdAt.getTime()
    : sort === "deadline" ? (a.o.deadline?.getTime() ?? 9e15) - (b.o.deadline?.getTime() ?? 9e15)
    : sort === "budget" ? (b.o.budgetAmount ?? 0) - (a.o.budgetAmount ?? 0)
    : b.m.score - a.m.score);

  return (
    <>
      <FilterForm key={JSON.stringify(sp)} tab="opportunities" action={{ href: "/opportunities/new", label: "Post an open call" }}>
        <Select name="category" value={sp.category} label="Any type" options={OPPORTUNITY_CATEGORIES.map((c) => [c.slug, c.name])} />
        <Select name="genre" value={sp.genre} label="Any genre" options={opts.genres.map((g) => [g.slug, g.name])} />
        <Select name="where" value={sp.where} label="Anywhere" options={[["remote", "Remote"], ["local", `In ${me.city ?? "my city"}`]]} />
        <Select name="paid" value={sp.paid} label="Paid or unpaid" options={[["paid", "Paid"], ["unpaid", "Unpaid / credit"]]} />
        <Toggle name="mine" checked={!!sp.mine} label="Posted by me" />
        <Select name="sort" value={sp.sort} label="Most relevant" options={[["new", "Newest"], ["deadline", "Closing soon"], ["budget", "Highest budget"]]} sort />
      </FilterForm>
      <p className="mb-4 mt-6 text-sm text-muted">{list.length} open call{list.length === 1 ? "" : "s"}</p>
      {list.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map(({ o, m }) => <OpportunityCard key={o.id} o={o} match={o.authorId === me.id ? undefined : m} />)}</div>
      ) : <Empty title="No open calls match" action={{ href: "/opportunities/new", label: "Post one yourself" }}>Clear a filter, or post what you need — the right people will see it on their Radar.</Empty>}
    </>
  );
}

async function Projects({ sp, me, opts }: { sp: SP; me: Me; opts: Opts }) {
  const Pr = s.projects;
  const where: SQL[] = [];
  if (sp.status) where.push(eq(Pr.status, sp.status as "idea"));
  if (sp.genre) where.push(sql`${Pr.genreId} = (select id from genres where slug = ${sp.genre})`);
  if (sp.open) where.push(sql`exists (select 1 from opportunities o where o.project_id = ${Pr.id} and o.status = 'open')`);
  if (sp.mine) where.push(sql`exists (select 1 from project_members m where m.project_id = ${Pr.id} and m.profile_id = ${me.id} and m.status = 'active')`);
  const list = await loadProjects(where.length ? and(...where) : undefined);
  return (
    <>
      <FilterForm key={JSON.stringify(sp)} tab="projects" action={{ href: "/projects/new", label: "Start a project" }}>
        <Select name="status" value={sp.status} label="Any stage" options={PROJECT_STATUSES.map((x) => [x.slug, x.name])} />
        <Select name="genre" value={sp.genre} label="Any genre" options={opts.genres.map((g) => [g.slug, g.name])} />
        <Toggle name="open" checked={!!sp.open} label="Has open roles" />
        <Toggle name="mine" checked={!!sp.mine} label="I'm on it" />
      </FilterForm>
      <p className="mb-4 mt-6 text-sm text-muted">{list.length} project{list.length === 1 ? "" : "s"}</p>
      {list.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">{list.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
      ) : <Empty title="No projects match" action={{ href: "/projects/new", label: "Start a project" }} />}
    </>
  );
}

async function Scenes({ meId }: { meId: string }) {
  const rows = await db.select({
    sc: s.scenes,
    members: sql<number>`(select count(*)::int from scene_members m where m.scene_id = ${s.scenes.id})`,
    open: sql<number>`(select count(*)::int from opportunities o where o.scene_id = ${s.scenes.id} and o.status = 'open')`,
    projects: sql<number>`(select count(*)::int from projects p where p.scene_id = ${s.scenes.id})`,
    joined: sql<boolean>`exists (select 1 from scene_members m where m.scene_id = ${s.scenes.id} and m.profile_id = ${meId})`,
  }).from(s.scenes).orderBy(s.scenes.name);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(({ sc, members, open, projects, joined }) => (
        <Link key={sc.id} href={`/scenes/${sc.slug}`} className="panel group flex gap-4 p-4 hover:bg-raised">
          <Artwork seed={sc.artSeed} className="size-20 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <h3 className="display text-2xl leading-tight group-hover:underline">{sc.name}</h3>
            <p className="mt-1 text-[13px] text-muted">{members} creators · {open} open call{open === 1 ? "" : "s"} · {projects} project{projects === 1 ? "" : "s"}</p>
            {joined && <p className="mt-1 text-[13px] text-ok">You're in this scene</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}
