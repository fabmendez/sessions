"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { maybeUpload } from "@/lib/storage";
import { PROJECT_STATUSES, statusName } from "@/lib/taxonomy";

export type ActionState = { error?: string } | undefined;

const slugify = (x: string) => x.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "project";

export async function createProject(_: ActionState, form: FormData): Promise<ActionState> {
  const { profile } = await requireProfile();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const genreSlug = String(form.get("genre") ?? "");
  const status = String(form.get("status") ?? "idea") as (typeof PROJECT_STATUSES)[number]["slug"];
  const myRole = String(form.get("myRole") ?? "").trim() || "Produced";
  const sceneId = String(form.get("sceneId") ?? "") || null;
  if (!title) return { error: "Give the project a name." };
  if (!PROJECT_STATUSES.some((x) => x.slug === status)) return { error: "Pick a status." };

  let demoUrl: string | null = null, artworkUrl: string | null = null;
  try {
    demoUrl = await maybeUpload(form.get("demo"), "audio");
    artworkUrl = await maybeUpload(form.get("artwork"), "art");
  } catch (e) { return { error: (e as Error).message }; }

  const [genre] = genreSlug ? await db.select().from(s.genres).where(eq(s.genres.slug, genreSlug)) : [];
  let slug = slugify(title);
  const [clash] = await db.select({ id: s.projects.id }).from(s.projects).where(eq(s.projects.slug, slug));
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const [p] = await db.insert(s.projects).values({
    slug, title, description, status, genreId: genre?.id ?? null, ownerId: profile.id, demoUrl, artworkUrl, sceneId,
    artSeed: Math.floor(Math.random() * 1e6), progress: { idea: 5, recruiting: 15, in_progress: 40, mixing: 75, finished: 100, released: 100 }[status],
  }).returning();
  await db.insert(s.projectMembers).values({ projectId: p.id, profileId: profile.id, role: myRole });
  await db.insert(s.projectActivity).values({ projectId: p.id, actorId: profile.id, kind: "created", body: "Started the project" });
  redirect(`/projects/${p.slug}?new=1`);
}

async function ownProject(projectId: string, profileId: string) {
  const [p] = await db.select().from(s.projects).where(and(eq(s.projects.id, projectId), eq(s.projects.ownerId, profileId)));
  return p ?? null;
}

export async function updateProject(form: FormData) {
  const { profile } = await requireProfile();
  const p = await ownProject(String(form.get("projectId")), profile.id);
  if (!p) return;
  const status = String(form.get("status") ?? p.status) as typeof p.status;
  const progress = Math.max(0, Math.min(100, Number(form.get("progress") ?? p.progress)));
  // Finishing goes through issueCredits so contributors get credited.
  if ((status === "finished" || status === "released") && !p.creditsIssuedAt) return;
  await db.update(s.projects).set({ status, progress, updatedAt: new Date() }).where(eq(s.projects.id, p.id));
  if (status !== p.status) await db.insert(s.projectActivity).values({ projectId: p.id, actorId: profile.id, kind: "status", body: `Moved to ${statusName(status)}` });
  revalidatePath(`/projects/${p.slug}`);
}

export async function postProjectUpdate(form: FormData) {
  const { profile } = await requireProfile();
  const projectId = String(form.get("projectId"));
  const body = String(form.get("body") ?? "").trim().slice(0, 500);
  const [m] = await db.select().from(s.projectMembers)
    .where(and(eq(s.projectMembers.projectId, projectId), eq(s.projectMembers.profileId, profile.id), eq(s.projectMembers.status, "active")));
  if (!m) return;
  let demoUrl: string | null = null;
  try { demoUrl = await maybeUpload(form.get("demo"), "audio"); } catch { return; }
  if (!body && !demoUrl) return;
  if (demoUrl) await db.update(s.projects).set({ demoUrl }).where(eq(s.projects.id, projectId));
  await db.insert(s.projectActivity).values({ projectId, actorId: profile.id, kind: demoUrl ? "demo" : "update", body: body || "Uploaded a new demo" });
  const [p] = await db.update(s.projects).set({ updatedAt: new Date() }).where(eq(s.projects.id, projectId)).returning();
  revalidatePath(`/projects/${p.slug}`);
}

export async function toggleFollow(form: FormData) {
  const { profile } = await requireProfile();
  const projectId = String(form.get("projectId"));
  const following = form.get("following") === "1";
  if (following) await db.delete(s.projectFollows).where(and(eq(s.projectFollows.projectId, projectId), eq(s.projectFollows.profileId, profile.id)));
  else await db.insert(s.projectFollows).values({ projectId, profileId: profile.id }).onConflictDoNothing();
  revalidatePath("/", "layout");
}

/** Owner finishes the project: every active member gets a credit; the owner's own is auto-confirmed. */
export async function issueCredits(form: FormData) {
  const { profile } = await requireProfile();
  const p = await ownProject(String(form.get("projectId")), profile.id);
  if (!p || p.creditsIssuedAt) return;
  const status = form.get("status") === "released" ? "released" : "finished";
  const members = await db.select().from(s.projectMembers).where(and(eq(s.projectMembers.projectId, p.id), eq(s.projectMembers.status, "active")));
  const rows = members.flatMap((m) => {
    const role = String(form.get(`role_${m.profileId}`) ?? m.role).trim() || m.role;
    if (form.get(`omit_${m.profileId}`) === "on") return [];
    const mine = m.profileId === profile.id;
    return [{ projectId: p.id, profileId: m.profileId, role, confirmed: mine, confirmedAt: mine ? new Date() : null }];
  });
  if (rows.length) await db.insert(s.credits).values(rows).onConflictDoNothing();
  await db.update(s.projects).set({ status, progress: 100, creditsIssuedAt: new Date(), updatedAt: new Date() }).where(eq(s.projects.id, p.id));
  await db.update(s.opportunities).set({ status: "closed" }).where(and(eq(s.opportunities.projectId, p.id), eq(s.opportunities.status, "open")));
  await db.insert(s.projectActivity).values([
    { projectId: p.id, actorId: profile.id, kind: "status", body: `Moved to ${statusName(status)}` },
    { projectId: p.id, actorId: profile.id, kind: "credits", body: `Issued credits to ${rows.length} contributor${rows.length === 1 ? "" : "s"}` },
  ]);
  revalidatePath("/", "layout");
}

export async function confirmCredits(form: FormData) {
  const { profile } = await requireProfile();
  const ids = form.getAll("creditId").map(String);
  if (!ids.length) return;
  await db.update(s.credits).set({ confirmed: true, confirmedAt: new Date() })
    .where(and(inArray(s.credits.id, ids), eq(s.credits.profileId, profile.id)));
  revalidatePath("/", "layout");
}

export async function setReleased(form: FormData) {
  const { profile } = await requireProfile();
  const p = await ownProject(String(form.get("projectId")), profile.id);
  if (!p || p.status !== "finished") return;
  await db.update(s.projects).set({ status: "released", updatedAt: new Date() }).where(eq(s.projects.id, p.id));
  await db.insert(s.projectActivity).values({ projectId: p.id, actorId: profile.id, kind: "status", body: "Moved to Released" });
  revalidatePath(`/projects/${p.slug}`);
}
