import "server-only";
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";

const personCols = {
  id: s.creatorProfiles.id, handle: s.creatorProfiles.handle, displayName: s.creatorProfiles.displayName,
  avatarSeed: s.creatorProfiles.avatarSeed, avatarUrl: s.creatorProfiles.avatarUrl,
};
export type Person = { id: string; handle: string; displayName: string; avatarSeed: number; avatarUrl: string | null };

// ─── Projects ─────────────────────────────────────────────────────────────
export type ProjectSummary = typeof s.projects.$inferSelect & {
  genre: { slug: string; name: string } | null;
  owner: Person;
  members: (Person & { role: string; status: "invited" | "active" | "left" })[];
  openRoles: { id: string; title: string; category: string }[];
  scene: { slug: string; name: string } | null;
};

export async function loadProjects(where?: SQL, opts: { limit?: number } = {}): Promise<ProjectSummary[]> {
  const rows = await db.select({ p: s.projects, genre: { slug: s.genres.slug, name: s.genres.name }, owner: personCols, scene: { slug: s.scenes.slug, name: s.scenes.name } })
    .from(s.projects)
    .innerJoin(s.creatorProfiles, eq(s.creatorProfiles.id, s.projects.ownerId))
    .leftJoin(s.genres, eq(s.genres.id, s.projects.genreId))
    .leftJoin(s.scenes, eq(s.scenes.id, s.projects.sceneId))
    .where(where).orderBy(desc(s.projects.updatedAt)).limit(opts.limit ?? 100);
  const ids = rows.map((r) => r.p.id);
  if (!ids.length) return [];
  const [members, roles] = await Promise.all([
    db.select({ projectId: s.projectMembers.projectId, role: s.projectMembers.role, status: s.projectMembers.status, ...personCols })
      .from(s.projectMembers).innerJoin(s.creatorProfiles, eq(s.creatorProfiles.id, s.projectMembers.profileId))
      .where(and(inArray(s.projectMembers.projectId, ids), sql`${s.projectMembers.status} <> 'left'`)).orderBy(s.projectMembers.joinedAt),
    db.select({ projectId: s.opportunities.projectId, id: s.opportunities.id, title: s.opportunities.title, category: s.opportunities.category })
      .from(s.opportunities).where(and(inArray(s.opportunities.projectId, ids), eq(s.opportunities.status, "open"))),
  ]);
  return rows.map(({ p, genre, owner, scene }) => ({
    ...p, genre: genre?.slug ? genre : null, owner, scene: scene?.slug ? scene : null,
    members: members.filter((m) => m.projectId === p.id).map(({ projectId: _, ...m }) => m),
    openRoles: roles.filter((r) => r.projectId === p.id).map(({ projectId: _, ...r }) => r),
  }));
}

export async function loadProject(slug: string) {
  return (await loadProjects(eq(s.projects.slug, slug), { limit: 1 }))[0] ?? null;
}

export async function creditsForProject(projectId: string) {
  return db.select({ ...personCols, creditId: s.credits.id, role: s.credits.role, confirmed: s.credits.confirmed })
    .from(s.credits).innerJoin(s.creatorProfiles, eq(s.creatorProfiles.id, s.credits.profileId))
    .where(eq(s.credits.projectId, projectId)).orderBy(s.credits.createdAt);
}

/** Credits on a profile, with co-credited people — the liner notes. */
export async function creditsForProfile(profileId: string) {
  const mine = await db.select({ c: s.credits, p: s.projects })
    .from(s.credits).innerJoin(s.projects, eq(s.projects.id, s.credits.projectId))
    .where(eq(s.credits.profileId, profileId)).orderBy(desc(s.projects.updatedAt));
  const projectIds = [...new Set(mine.map((m) => m.p.id))];
  const others = projectIds.length
    ? await db.select({ projectId: s.credits.projectId, role: s.credits.role, confirmed: s.credits.confirmed, ...personCols })
        .from(s.credits).innerJoin(s.creatorProfiles, eq(s.creatorProfiles.id, s.credits.profileId))
        .where(and(inArray(s.credits.projectId, projectIds), sql`${s.credits.profileId} <> ${profileId}`))
    : [];
  return projectIds.map((pid) => {
    const entries = mine.filter((m) => m.p.id === pid);
    return {
      project: entries[0].p,
      roles: entries.map((e) => e.c.role),
      confirmed: entries.every((e) => e.c.confirmed),
      creditIds: entries.map((e) => e.c.id),
      with: others.filter((o) => o.projectId === pid),
    };
  });
}

export async function projectActivityFeed(projectIds: string[], limit = 20) {
  if (!projectIds.length) return [];
  return db.select({ a: s.projectActivity, actor: personCols, project: { slug: s.projects.slug, title: s.projects.title, artSeed: s.projects.artSeed, artworkUrl: s.projects.artworkUrl } })
    .from(s.projectActivity)
    .innerJoin(s.projects, eq(s.projects.id, s.projectActivity.projectId))
    .leftJoin(s.creatorProfiles, eq(s.creatorProfiles.id, s.projectActivity.actorId))
    .where(inArray(s.projectActivity.projectId, projectIds))
    .orderBy(desc(s.projectActivity.createdAt)).limit(limit);
}

// ─── Opportunities ────────────────────────────────────────────────────────
export type OpportunitySummary = typeof s.opportunities.$inferSelect & {
  author: Person & { city: string | null };
  genres: { slug: string; name: string }[];
  project: { slug: string; title: string; artSeed: number; artworkUrl: string | null; status: string } | null;
  applicationCount: number;
  myApplication: { id: string; status: string } | null;
};

export async function loadOpportunities(where: SQL | undefined, viewerId?: string, limit = 100): Promise<OpportunitySummary[]> {
  const rows = await db.select({
    o: s.opportunities, author: { ...personCols, city: s.creatorProfiles.city },
    project: { slug: s.projects.slug, title: s.projects.title, artSeed: s.projects.artSeed, artworkUrl: s.projects.artworkUrl, status: s.projects.status },
    applicationCount: sql<number>`(select count(*)::int from opportunity_applications a where a.opportunity_id = ${s.opportunities.id})`,
  })
    .from(s.opportunities)
    .innerJoin(s.creatorProfiles, eq(s.creatorProfiles.id, s.opportunities.authorId))
    .leftJoin(s.projects, eq(s.projects.id, s.opportunities.projectId))
    .where(where).orderBy(desc(s.opportunities.createdAt)).limit(limit);
  const ids = rows.map((r) => r.o.id);
  if (!ids.length) return [];
  const [genres, mine] = await Promise.all([
    db.select({ oid: s.opportunityGenres.opportunityId, slug: s.genres.slug, name: s.genres.name })
      .from(s.opportunityGenres).innerJoin(s.genres, eq(s.genres.id, s.opportunityGenres.genreId)).where(inArray(s.opportunityGenres.opportunityId, ids)),
    viewerId
      ? db.select({ oid: s.opportunityApplications.opportunityId, id: s.opportunityApplications.id, status: s.opportunityApplications.status })
          .from(s.opportunityApplications).where(and(inArray(s.opportunityApplications.opportunityId, ids), eq(s.opportunityApplications.applicantId, viewerId)))
      : Promise.resolve([]),
  ]);
  return rows.map(({ o, author, project, applicationCount }) => {
    const m = mine.find((x) => x.oid === o.id);
    return {
      ...o, author, project: project?.slug ? project : null, applicationCount,
      genres: genres.filter((g) => g.oid === o.id).map(({ slug, name }) => ({ slug, name })),
      myApplication: m ? { id: m.id, status: m.status } : null,
    };
  });
}

export const openNow = sql`${s.opportunities.status} = 'open' and (${s.opportunities.deadline} is null or ${s.opportunities.deadline} > now())`;
