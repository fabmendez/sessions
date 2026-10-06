"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { maybeUpload } from "@/lib/storage";
import { OPPORTUNITY_CATEGORIES, KEYS, categoryName } from "@/lib/taxonomy";
import { findOrCreateConversation } from "@/lib/conversations";

export type ActionState = { error?: string } | undefined;

export async function createOpportunity(_: ActionState, form: FormData): Promise<ActionState> {
  const { profile } = await requireProfile();
  const g = (k: string) => String(form.get(k) ?? "").trim();
  const category = g("category");
  if (!OPPORTUNITY_CATEGORIES.some((c) => c.slug === category)) return { error: "Pick what you're looking for." };
  const title = g("title"), projectSummary = g("projectSummary"), lookingFor = g("lookingFor");
  if (!title) return { error: "Add a headline, e.g. “Need a vocalist for a garage track”." };
  if (!projectSummary) return { error: "Describe the project in a line." };
  if (!lookingFor) return { error: "Say who you're looking for." };
  const bpm = g("bpm") ? Number(g("bpm")) : null;
  if (bpm != null && (!Number.isInteger(bpm) || bpm < 40 || bpm > 220)) return { error: "BPM should be a whole number between 40 and 220." };
  const key = g("key");
  if (key && !KEYS.includes(key)) return { error: "Pick a key from the list." };
  const paid = g("paid") === "yes";
  const budget = g("budget") ? Math.round(Number(g("budget"))) : null;
  if (paid && (budget == null || Number.isNaN(budget) || budget <= 0)) return { error: "Add a budget for paid work — it's the first thing people look for." };
  const deadline = g("deadline") ? new Date(`${g("deadline")}T18:00:00`) : null;
  if (deadline && deadline.getTime() < Date.now()) return { error: "The deadline needs to be in the future." };
  const remote = g("remote") !== "no";

  const projectId = g("projectId") || null;
  if (projectId) {
    const [own] = await db.select().from(s.projects).where(and(eq(s.projects.id, projectId), eq(s.projects.ownerId, profile.id)));
    if (!own) return { error: "You can only post open roles on projects you run." };
  }
  let demoUrl: string | null = null;
  try { demoUrl = await maybeUpload(form.get("demo"), "audio"); } catch (e) { return { error: (e as Error).message }; }
  if (!demoUrl && projectId) {
    const [p] = await db.select({ demoUrl: s.projects.demoUrl }).from(s.projects).where(eq(s.projects.id, projectId));
    demoUrl = p?.demoUrl ?? null;
  }

  const [o] = await db.insert(s.opportunities).values({
    authorId: profile.id, projectId, sceneId: g("sceneId") || null, category: category as "vocalist", title, projectSummary, lookingFor,
    style: g("style") || null, bpm, musicalKey: key || null, paid, budgetAmount: paid ? budget : null, currency: g("currency") || "GBP",
    deadline, remote, city: remote ? profile.city : g("city") || profile.city, demoUrl,
  }).returning();
  const genreSlugs = form.getAll("genres").map(String);
  if (genreSlugs.length) {
    const rows = await db.select().from(s.genres).where(inArray(s.genres.slug, genreSlugs));
    if (rows.length) await db.insert(s.opportunityGenres).values(rows.map((r) => ({ opportunityId: o.id, genreId: r.id })));
  }
  if (projectId) {
    await db.update(s.projects).set({ status: "recruiting", updatedAt: new Date() }).where(and(eq(s.projects.id, projectId), inArray(s.projects.status, ["idea", "in_progress"])));
    await db.insert(s.projectActivity).values({ projectId, actorId: profile.id, kind: "update", body: `Opened a role: ${categoryName(category)}` });
  }
  redirect(`/opportunities/${o.id}?posted=1`);
}

export async function applyToOpportunity(_: ActionState, form: FormData): Promise<ActionState> {
  const { profile } = await requireProfile();
  const opportunityId = String(form.get("opportunityId"));
  const message = String(form.get("message") ?? "").trim();
  const workSampleId = String(form.get("workSampleId") ?? "") || null;
  const feeRaw = String(form.get("proposedFee") ?? "").trim();
  const proposedFee = feeRaw ? Math.round(Number(feeRaw)) : null;
  if (message.length < 10) return { error: "Write a short note — what you'd bring to it." };
  if (proposedFee != null && (Number.isNaN(proposedFee) || proposedFee < 0)) return { error: "Proposed fee should be a number." };
  const [o] = await db.select().from(s.opportunities).where(eq(s.opportunities.id, opportunityId));
  if (!o || o.status !== "open") return { error: "This open call isn't taking applications any more." };
  if (o.authorId === profile.id) return { error: "You posted this one." };
  if (workSampleId) {
    const [w] = await db.select().from(s.workSamples).where(and(eq(s.workSamples.id, workSampleId), eq(s.workSamples.profileId, profile.id)));
    if (!w) return { error: "Pick one of your own pieces of work." };
  }
  await db.insert(s.opportunityApplications).values({ opportunityId, applicantId: profile.id, message: message.slice(0, 1200), workSampleId, proposedFee })
    .onConflictDoNothing();
  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/radar");
  return undefined;
}

export async function withdrawApplication(form: FormData) {
  const { profile } = await requireProfile();
  const id = String(form.get("applicationId"));
  const [a] = await db.delete(s.opportunityApplications)
    .where(and(eq(s.opportunityApplications.id, id), eq(s.opportunityApplications.applicantId, profile.id), eq(s.opportunityApplications.status, "pending"))).returning();
  if (a) revalidatePath(`/opportunities/${a.opportunityId}`);
}

/** Author reviews an application. Accepting adds the person to the linked project and fills the role. */
export async function reviewApplication(form: FormData) {
  const { profile } = await requireProfile();
  const id = String(form.get("applicationId"));
  const status = String(form.get("status")) as "shortlisted" | "accepted" | "declined";
  if (!["shortlisted", "accepted", "declined"].includes(status)) return;
  const [row] = await db.select({ a: s.opportunityApplications, o: s.opportunities })
    .from(s.opportunityApplications).innerJoin(s.opportunities, eq(s.opportunities.id, s.opportunityApplications.opportunityId))
    .where(eq(s.opportunityApplications.id, id));
  if (!row || row.o.authorId !== profile.id) return;
  await db.update(s.opportunityApplications).set({ status }).where(eq(s.opportunityApplications.id, id));

  if (status === "accepted") {
    const role = OPPORTUNITY_CATEGORIES.find((c) => c.slug === row.o.category)?.name.replace(" wanted", "").replace(" request", "") ?? "Collaborator";
    const conv = await findOrCreateConversation(profile.id, row.a.applicantId);
    if (row.o.projectId) {
      await db.insert(s.projectMembers).values({ projectId: row.o.projectId, profileId: row.a.applicantId, role, status: "active", invitedById: profile.id })
        .onConflictDoUpdate({ target: [s.projectMembers.projectId, s.projectMembers.profileId], set: { status: "active", role } });
      const [applicant] = await db.select({ name: s.creatorProfiles.displayName }).from(s.creatorProfiles).where(eq(s.creatorProfiles.id, row.a.applicantId));
      await db.insert(s.projectActivity).values({ projectId: row.o.projectId, actorId: row.a.applicantId, kind: "joined", body: `${applicant?.name ?? "Someone"} joined as ${role} via open call` });
      await db.update(s.projects).set({ status: "in_progress", updatedAt: new Date() }).where(and(eq(s.projects.id, row.o.projectId), eq(s.projects.status, "recruiting")));
      await db.insert(s.messages).values([
        { conversationId: conv, senderId: profile.id, body: `You're in — welcome to the project. I've added you as ${role}.` },
        { conversationId: conv, senderId: profile.id, kind: "project_link", refId: row.o.projectId },
      ]);
    } else {
      await db.insert(s.messages).values({ conversationId: conv, senderId: profile.id, body: `I'd love to go ahead with you on “${row.o.title}”. Let's sort out the details here.` });
    }
    await db.update(s.conversations).set({ lastMessageAt: new Date() }).where(eq(s.conversations.id, conv));
    await db.update(s.opportunities).set({ status: "filled" }).where(eq(s.opportunities.id, row.o.id));
  }
  revalidatePath(`/opportunities/${row.o.id}`);
  revalidatePath("/radar");
}

export async function closeOpportunity(form: FormData) {
  const { profile } = await requireProfile();
  const id = String(form.get("opportunityId"));
  await db.update(s.opportunities).set({ status: "closed" }).where(and(eq(s.opportunities.id, id), eq(s.opportunities.authorId, profile.id)));
  revalidatePath(`/opportunities/${id}`);
}
