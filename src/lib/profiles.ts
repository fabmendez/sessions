import "server-only";
import { inArray, sql, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";

export type WorkItem = {
  id: string; title: string; creditRole: string; audioUrl: string | null; externalUrl: string | null; artworkUrl: string | null;
  artSeed: number; genre: string | null; collaboratorNote: string | null;
  collaborators: { handle: string; displayName: string }[];
};

export type CollabStats = { completed: number; unique: number; repeat: number; pendingCredits: number };

export type ProfileSummary = typeof s.creatorProfiles.$inferSelect & {
  roles: { slug: string; name: string; isPrimary: boolean }[];
  genres: { slug: string; name: string }[];
  skills: { name: string; category: string }[];
  samples: WorkItem[];
  stats: CollabStats;
  sceneIds: string[];
};

const EMPTY: CollabStats = { completed: 0, unique: 0, repeat: 0, pendingCredits: 0 };

/** Collaboration stats derived from *confirmed* credits only, so they can't be self-reported. */
export async function collabStats(ids: string[]): Promise<Map<string, CollabStats>> {
  const out = new Map<string, CollabStats>(ids.map((id) => [id, { ...EMPTY }]));
  if (!ids.length) return out;
  const idList = sql.join(ids.map((i) => sql`${i}`), sql`, `);
  const completed = await db.execute<{ profile_id: string; completed: number; pending: number }>(sql`
    select profile_id,
      count(distinct project_id) filter (where confirmed)::int as completed,
      count(*) filter (where not confirmed)::int as pending
    from credits where profile_id in (${idList}) group by profile_id`);
  for (const r of completed) Object.assign(out.get(r.profile_id)!, { completed: r.completed, pendingCredits: r.pending });
  const pairs = await db.execute<{ me: string; unique: number; repeat: number }>(sql`
    select me, count(*)::int as unique, count(*) filter (where shared >= 2)::int as repeat from (
      select c1.profile_id as me, c2.profile_id as other, count(distinct c1.project_id) as shared
      from credits c1 join credits c2 on c1.project_id = c2.project_id and c1.profile_id <> c2.profile_id
      where c1.confirmed and c2.confirmed and c1.profile_id in (${idList})
      group by 1, 2
    ) t group by me`);
  for (const r of pairs) Object.assign(out.get(r.me)!, { unique: r.unique, repeat: r.repeat });
  return out;
}

/** Repeat collaborators for one profile, for "Worked with X twice" style trust signals. */
export async function collaboratorsOf(profileId: string) {
  return db.execute<{ id: string; handle: string; display_name: string; avatar_seed: number; avatar_url: string | null; shared: number }>(sql`
    select p.id, p.handle, p.display_name, p.avatar_seed, p.avatar_url, count(distinct c1.project_id)::int as shared
    from credits c1
    join credits c2 on c1.project_id = c2.project_id and c1.profile_id <> c2.profile_id and c2.confirmed
    join creator_profiles p on p.id = c2.profile_id
    where c1.profile_id = ${profileId} and c1.confirmed
    group by p.id order by shared desc, p.display_name limit 12`);
}

export async function loadProfiles(ids: string[]): Promise<ProfileSummary[]> {
  if (!ids.length) return [];
  const [base, roles, genres, skills, samples, stats, scenes] = await Promise.all([
    db.select().from(s.creatorProfiles).where(inArray(s.creatorProfiles.id, ids)),
    db.select({ profileId: s.profileRoles.profileId, slug: s.roles.slug, name: s.roles.name, isPrimary: s.profileRoles.isPrimary, sort: s.roles.sort })
      .from(s.profileRoles).innerJoin(s.roles, eq(s.roles.id, s.profileRoles.roleId)).where(inArray(s.profileRoles.profileId, ids)),
    db.select({ profileId: s.profileGenres.profileId, slug: s.genres.slug, name: s.genres.name })
      .from(s.profileGenres).innerJoin(s.genres, eq(s.genres.id, s.profileGenres.genreId)).where(inArray(s.profileGenres.profileId, ids)),
    db.select({ profileId: s.profileSkills.profileId, name: s.skills.name, category: s.skills.category })
      .from(s.profileSkills).innerJoin(s.skills, eq(s.skills.id, s.profileSkills.skillId)).where(inArray(s.profileSkills.profileId, ids)),
    loadSamples(ids),
    collabStats(ids),
    db.select().from(s.sceneMembers).where(inArray(s.sceneMembers.profileId, ids)),
  ]);
  const byId = new Map(base.map((p) => [p.id, p]));
  return ids.filter((id) => byId.has(id)).map((id) => ({
    ...byId.get(id)!,
    roles: roles.filter((r) => r.profileId === id).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sort - b.sort)
      .map(({ slug, name, isPrimary }) => ({ slug, name, isPrimary })),
    genres: genres.filter((g) => g.profileId === id).map(({ slug, name }) => ({ slug, name })),
    skills: skills.filter((k) => k.profileId === id).map(({ name, category }) => ({ name, category })),
    samples: samples.get(id) ?? [],
    stats: stats.get(id)!,
    sceneIds: scenes.filter((m) => m.profileId === id).map((m) => m.sceneId),
  }));
}

async function loadSamples(ids: string[]) {
  const rows = await db.select({ w: s.workSamples, genre: s.genres.name })
    .from(s.workSamples).leftJoin(s.genres, eq(s.genres.id, s.workSamples.genreId))
    .where(inArray(s.workSamples.profileId, ids)).orderBy(asc(s.workSamples.position));
  const sampleIds = rows.map((r) => r.w.id);
  const collabs = sampleIds.length
    ? await db.select({ sampleId: s.workSampleCollaborators.workSampleId, handle: s.creatorProfiles.handle, displayName: s.creatorProfiles.displayName })
        .from(s.workSampleCollaborators).innerJoin(s.creatorProfiles, eq(s.creatorProfiles.id, s.workSampleCollaborators.profileId))
        .where(inArray(s.workSampleCollaborators.workSampleId, sampleIds))
    : [];
  const out = new Map<string, WorkItem[]>();
  for (const { w, genre } of rows) {
    const list = out.get(w.profileId) ?? [];
    list.push({
      id: w.id, title: w.title, creditRole: w.creditRole, audioUrl: w.audioUrl, externalUrl: w.externalUrl, artworkUrl: w.artworkUrl,
      artSeed: w.artSeed, genre, collaboratorNote: w.collaboratorNote,
      collaborators: collabs.filter((c) => c.sampleId === w.id).map(({ handle, displayName }) => ({ handle, displayName })),
    });
    out.set(w.profileId, list);
  }
  return out;
}

export async function loadProfileByHandle(handle: string) {
  const [row] = await db.select({ id: s.creatorProfiles.id }).from(s.creatorProfiles).where(eq(s.creatorProfiles.handle, handle));
  if (!row) return null;
  return (await loadProfiles([row.id]))[0] ?? null;
}

export async function allOnboardedProfileIds() {
  const rows = await db.select({ id: s.creatorProfiles.id }).from(s.creatorProfiles).where(sql`${s.creatorProfiles.onboardedAt} is not null`);
  return rows.map((r) => r.id);
}

/** Connection state between viewer and another profile. */
export async function connectionBetween(a: string, b: string) {
  const [row] = await db.select().from(s.connections).where(sql`
    (${s.connections.requesterId} = ${a} and ${s.connections.addresseeId} = ${b}) or
    (${s.connections.requesterId} = ${b} and ${s.connections.addresseeId} = ${a})`);
  return row ?? null;
}
