"use server";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { invites, users } from "@/db/schema";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { baseUrl } from "@/lib/url";
import {
  INVITES_PER_MEMBER, canEmail, emailInvite, inviteState, inviteUrl, invitesLeft, isAdmin, issueLink, openInviteFor,
} from "@/lib/invites";

export type InviteActionState = { error?: string; ok?: string; url?: string; emailed?: boolean } | undefined;

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");

const refresh = () => { revalidatePath("/invites"); revalidatePath("/admin"); };

/** Links go out by email when it's set up; the caller always gets the link back to copy too. */
async function deliver(email: string, token: string, inviterName: string | null): Promise<InviteActionState> {
  const url = inviteUrl(await baseUrl(), token);
  const emailed = await emailInvite(email, url, inviterName);
  return { url, emailed, ok: emailed ? `Invite emailed to ${email}.` : `Invite approved for ${email}. Send them this link:` };
}

/** Member invites someone: goes to the admins for approval (admins' own invites are approved straight away). */
export async function requestInvite(_: InviteActionState, form: FormData): Promise<InviteActionState> {
  const { user, profile } = await requireProfile();
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data;
  const note = String(form.get("note") ?? "").trim().slice(0, 300);

  const [member] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (member) return { error: `${email} is already on Session.` };
  const open = await openInviteFor(db, email);
  if (open) {
    const mine = open.invitedById === profile.id;
    return { error: mine ? `You've already invited ${email}.` : `${email} already has an invite on the way.` };
  }

  const admin = isAdmin(user.email);
  if (!admin && (await invitesLeft(db, profile.id, user.email)) <= 0) {
    return { error: `You've used all ${INVITES_PER_MEMBER} of your invites. One frees up if an invite is declined, expires, or you withdraw it.` };
  }
  if (!admin && !note) return { error: "Add a line about who they are, so the admins know who they're approving." };

  const [row] = await db.insert(invites).values({ email, note, invitedById: profile.id }).returning();
  refresh();
  if (!admin) return { ok: `Sent for approval. Once an admin approves it, the link appears below for you to copy${canEmail() ? ` and ${email} gets it by email` : ""}.` };
  const token = await issueLink(db, row.id, profile.id);
  return deliver(email, token!, profile.displayName);
}

/** Inviter (or an admin) gets a fresh link for an approved invite, e.g. to send it themselves or because it expired. */
export async function newInviteLink(_: InviteActionState, form: FormData): Promise<InviteActionState> {
  const { user, profile } = await requireProfile();
  const [inv] = await db.select().from(invites).where(eq(invites.id, String(form.get("id"))));
  const admin = isAdmin(user.email);
  if (!inv || (inv.invitedById !== profile.id && !admin)) return { error: "Invite not found." };
  const state = inviteState(inv);
  if (state !== "approved" && state !== "expired") return { error: "This invite can't have a link right now." };
  // An expired invite stops counting against the inviter's allowance, so reviving it needs a free slot.
  if (state === "expired" && !admin && (await invitesLeft(db, profile.id, user.email)) <= 0) {
    return { error: `You've used all ${INVITES_PER_MEMBER} of your invites.` };
  }
  const token = await issueLink(db, inv.id);
  if (!token) return { error: "They've already joined." };
  const url = inviteUrl(await baseUrl(), token);
  return { url, ok: "New link — any earlier link for this invite no longer works." };
}

/** Inviter takes back an invite that hasn't been used yet. */
export async function withdrawInvite(form: FormData) {
  const { profile } = await requireProfile();
  await db.delete(invites).where(and(eq(invites.id, String(form.get("id"))), eq(invites.invitedById, profile.id), isNull(invites.acceptedAt)));
  refresh();
}

// ─── Admin ────────────────────────────────────────────────────────────────

export async function approveInvite(_: InviteActionState, form: FormData): Promise<InviteActionState> {
  const { profile } = await requireAdmin();
  const [inv] = await db.select().from(invites).where(eq(invites.id, String(form.get("id"))));
  if (!inv || inviteState(inv) !== "requested") return { error: "This request has already been handled." };
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, inv.email));
  if (taken) return { error: `${inv.email} is already on Session.` };
  const token = await issueLink(db, inv.id, profile.id);
  if (!token) return { error: "This request has already been handled." };
  // No revalidate here: the row would move lists and lose the link before it's copied. The UI refreshes on "Done".
  const [inviter] = inv.invitedById
    ? await db.query.creatorProfiles.findMany({ where: (p, { eq }) => eq(p.id, inv.invitedById!), columns: { displayName: true } })
    : [];
  return deliver(inv.email, token, inviter?.displayName ?? null);
}

export async function declineInvite(form: FormData) {
  const { profile } = await requireAdmin();
  await db.update(invites).set({ status: "declined", reviewedById: profile.id, reviewedAt: new Date(), tokenHash: null, expiresAt: null })
    .where(and(eq(invites.id, String(form.get("id"))), isNull(invites.acceptedAt)));
  refresh();
}

/** Admin deletes any invite that hasn't been used (its link stops working). */
export async function revokeInvite(form: FormData) {
  await requireAdmin();
  await db.delete(invites).where(and(eq(invites.id, String(form.get("id"))), isNull(invites.acceptedAt)));
  refresh();
}
