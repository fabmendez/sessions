"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { findOrCreateConversation } from "@/lib/conversations";

// ─── Connections ──────────────────────────────────────────────────────────
export async function connect(form: FormData) {
  const { profile } = await requireProfile();
  const to = String(form.get("profileId"));
  if (!to || to === profile.id) return;
  const [existing] = await db.select().from(s.connections).where(sql`
    (${s.connections.requesterId} = ${profile.id} and ${s.connections.addresseeId} = ${to}) or
    (${s.connections.requesterId} = ${to} and ${s.connections.addresseeId} = ${profile.id})`);
  if (existing) {
    // they already asked me → connecting accepts it
    if (existing.addresseeId === profile.id && existing.status === "pending") {
      await db.update(s.connections).set({ status: "accepted", respondedAt: new Date() }).where(eq(s.connections.id, existing.id));
    }
  } else {
    await db.insert(s.connections).values({ requesterId: profile.id, addresseeId: to });
  }
  revalidatePath("/", "layout");
}

export async function respondConnection(form: FormData) {
  const { profile } = await requireProfile();
  const id = String(form.get("connectionId"));
  const accept = form.get("accept") === "1";
  await db.update(s.connections).set({ status: accept ? "accepted" : "declined", respondedAt: new Date() })
    .where(and(eq(s.connections.id, id), eq(s.connections.addresseeId, profile.id)));
  revalidatePath("/", "layout");
}

// ─── Messaging ────────────────────────────────────────────────────────────
async function post(conversationId: string, senderId: string, msg: { kind?: typeof s.messages.$inferInsert.kind; body?: string; refId?: string; refRole?: string }) {
  await db.insert(s.messages).values({ conversationId, senderId, kind: msg.kind ?? "text", body: msg.body ?? "", refId: msg.refId, refRole: msg.refRole });
  await db.update(s.conversations).set({ lastMessageAt: new Date() }).where(eq(s.conversations.id, conversationId));
  await db.update(s.conversationParticipants).set({ lastReadAt: new Date() })
    .where(and(eq(s.conversationParticipants.conversationId, conversationId), eq(s.conversationParticipants.profileId, senderId)));
}

/** "Message" button: open (or start) a 1:1 thread, optionally pre-attaching a link. */
export async function messageCreator(form: FormData) {
  const { profile } = await requireProfile();
  const to = String(form.get("profileId"));
  if (to === profile.id) redirect("/messages");
  const id = await findOrCreateConversation(profile.id, to);
  const attachKind = form.get("attachKind") as "opportunity_link" | "project_link" | null;
  const attachId = form.get("attachId");
  if (attachKind && attachId) await post(id, profile.id, { kind: attachKind, refId: String(attachId) });
  redirect(`/messages/${id}`);
}

export async function sendMessage(form: FormData) {
  const { profile } = await requireProfile();
  const conversationId = String(form.get("conversationId"));
  const body = String(form.get("body") ?? "").trim().slice(0, 4000);
  const attach = String(form.get("attach") ?? ""); // "project:<id>" | "opportunity:<id>" | "profile:<id>"
  const [member] = await db.select().from(s.conversationParticipants)
    .where(and(eq(s.conversationParticipants.conversationId, conversationId), eq(s.conversationParticipants.profileId, profile.id)));
  if (!member) return;
  if (body) await post(conversationId, profile.id, { body });
  if (attach) {
    const [kind, id] = attach.split(":");
    const k = kind === "project" ? "project_link" : kind === "opportunity" ? "opportunity_link" : kind === "profile" ? "profile_link" : null;
    if (k && id) await post(conversationId, profile.id, { kind: k, refId: id });
  }
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
}

// ─── Project invites ──────────────────────────────────────────────────────
export async function inviteToProject(form: FormData) {
  const { profile } = await requireProfile();
  const projectId = String(form.get("projectId"));
  const to = String(form.get("profileId"));
  const role = String(form.get("role") ?? "").trim() || "Collaborator";
  const note = String(form.get("note") ?? "").trim();
  const [project] = await db.select().from(s.projects).where(eq(s.projects.id, projectId));
  if (!project || project.ownerId !== profile.id || to === profile.id) return;
  await db.insert(s.projectMembers).values({ projectId, profileId: to, role, status: "invited", invitedById: profile.id })
    .onConflictDoUpdate({ target: [s.projectMembers.projectId, s.projectMembers.profileId], set: { role, status: "invited", invitedById: profile.id }, where: sql`${s.projectMembers.status} <> 'active'` });
  const conv = await findOrCreateConversation(profile.id, to);
  if (note) await post(conv, profile.id, { body: note });
  await post(conv, profile.id, { kind: "project_invite", refId: projectId, refRole: role });
  redirect(`/messages/${conv}`);
}

export async function respondInvite(form: FormData) {
  const { profile } = await requireProfile();
  const projectId = String(form.get("projectId"));
  const accept = form.get("accept") === "1";
  const [m] = await db.select().from(s.projectMembers)
    .where(and(eq(s.projectMembers.projectId, projectId), eq(s.projectMembers.profileId, profile.id), eq(s.projectMembers.status, "invited")));
  if (!m) return;
  if (accept) {
    await db.update(s.projectMembers).set({ status: "active", joinedAt: new Date() })
      .where(and(eq(s.projectMembers.projectId, projectId), eq(s.projectMembers.profileId, profile.id)));
    await db.insert(s.projectActivity).values({ projectId, actorId: profile.id, kind: "joined", body: `Joined as ${m.role}` });
    await db.update(s.projects).set({ updatedAt: new Date() }).where(eq(s.projects.id, projectId));
  } else {
    await db.delete(s.projectMembers).where(and(eq(s.projectMembers.projectId, projectId), eq(s.projectMembers.profileId, profile.id)));
  }
  revalidatePath("/", "layout");
}
