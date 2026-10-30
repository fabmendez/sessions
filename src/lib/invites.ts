// Invite-only signups with admin approval. Shared by the app and scripts/invite.ts, so no "server-only" here.
//   member requests (status "requested") → admin approves ("approved", gets a link) or declines ("declined")
//   → the person opens the link and creates their account (acceptedAt set). Admins' own invites start approved.
import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, gt, isNotNull, isNull, or } from "drizzle-orm";
import type { DB } from "@/db/connect";
import { invites, creatorProfiles } from "@/db/schema";

export const INVITE_TTL_DAYS = 14;
/** How many invites each member can have out at once (waiting for review, approved, or accepted). Admins: unlimited. */
export const INVITES_PER_MEMBER = Number(process.env.INVITES_PER_MEMBER ?? 5);

export type Invite = typeof invites.$inferSelect;
export type InviteState = "requested" | "approved" | "joined" | "expired" | "declined";

export const hashInviteToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Admins come from ADMIN_EMAILS (comma-separated) in the environment. */
export function isAdmin(email: string) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export function inviteState(i: Pick<Invite, "status" | "acceptedAt" | "expiresAt">): InviteState {
  if (i.acceptedAt) return "joined";
  if (i.status !== "approved") return i.status;
  return i.expiresAt && i.expiresAt > new Date() ? "approved" : "expired";
}

/** Still open: waiting for review, or approved with a live link. Declined, expired and accepted ones aren't. */
const openFilter = () => and(isNull(invites.acceptedAt), or(
  eq(invites.status, "requested"),
  and(eq(invites.status, "approved"), gt(invites.expiresAt, new Date())),
));

export async function invitesLeft(db: DB, profileId: string, email: string) {
  if (isAdmin(email)) return Infinity;
  const [{ n }] = await db.select({ n: count() }).from(invites).where(and(
    eq(invites.invitedById, profileId),
    or(isNotNull(invites.acceptedAt), openFilter()),
  ));
  return Math.max(0, INVITES_PER_MEMBER - n);
}

/** An open invite for this email, if anyone has one. */
export async function openInviteFor(db: DB, email: string) {
  const [row] = await db.select().from(invites).where(and(eq(invites.email, email), openFilter())).limit(1);
  return row ?? null;
}

export const pendingReviewCount = async (db: DB) =>
  (await db.select({ n: count() }).from(invites).where(and(eq(invites.status, "requested"), isNull(invites.acceptedAt))))[0].n;

/**
 * Give an invite a fresh link: approves it if it was waiting, and replaces any earlier link (the old one stops
 * working). The token only ever exists in the returned link; the database keeps its hash.
 */
export async function issueLink(db: DB, inviteId: string, reviewerId?: string | null) {
  const token = randomBytes(24).toString("base64url");
  const [row] = await db.update(invites).set({
    status: "approved",
    tokenHash: hashInviteToken(token),
    expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
    ...(reviewerId !== undefined ? { reviewedById: reviewerId, reviewedAt: new Date() } : {}),
  }).where(and(eq(invites.id, inviteId), isNull(invites.acceptedAt))).returning();
  return row ? token : null;
}

export const inviteUrl = (base: string, token: string) => `${base.replace(/\/$/, "")}/invite/${token}`;

export type InviteLookup =
  | { state: "valid"; id: string; email: string; inviterName: string | null }
  | { state: "used" | "expired"; inviterName: string | null }
  | { state: "invalid" };

export async function findInvite(db: DB, token: string): Promise<InviteLookup> {
  if (!token) return { state: "invalid" };
  const [row] = await db
    .select({ invite: invites, inviterName: creatorProfiles.displayName })
    .from(invites)
    .leftJoin(creatorProfiles, eq(creatorProfiles.id, invites.invitedById))
    .where(eq(invites.tokenHash, hashInviteToken(token)));
  if (!row || row.invite.status !== "approved") return { state: "invalid" };
  const { invite, inviterName } = row;
  if (invite.acceptedAt) return { state: "used", inviterName };
  if (!invite.expiresAt || invite.expiresAt <= new Date()) return { state: "expired", inviterName };
  return { state: "valid", id: invite.id, email: invite.email, inviterName };
}

/** True when the app can send invite emails itself. */
export const canEmail = () => !!(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());

/**
 * Emails the link through Resend when RESEND_API_KEY and EMAIL_FROM are set. Returns whether it was sent;
 * without them the inviter or admin copies the link instead (the UI always shows it).
 */
export async function emailInvite(to: string, url: string, inviterName: string | null) {
  if (!canEmail()) return false;
  const who = inviterName ?? "Someone";
  const text = `${who} invited you to Session — the network where producers, vocalists, writers, DJs and engineers find each other and make records together.\n\nSet up your account here (the link works for ${INVITE_TTL_DAYS} days):\n${url}\n`;
  const html = `<p>${esc(who)} invited you to <b>Session</b> — the network where producers, vocalists, writers, DJs and engineers find each other and make records together.</p>
<p><a href="${esc(url)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#f5b841;color:#1a1408;text-decoration:none;font-weight:600">Accept your invite</a></p>
<p style="color:#666;font-size:13px">The link works for ${INVITE_TTL_DAYS} days. If the button doesn't work, paste this into your browser:<br>${esc(url)}</p>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM!.trim(), to, subject: `${who} invited you to Session`, text, html }),
    });
    if (!res.ok) console.error("Invite email failed:", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("Invite email failed:", e);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
