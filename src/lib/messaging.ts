import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, exec } from "@/db";
import * as s from "@/db/schema";

export async function inboxFor(profileId: string) {
  return exec<{
    id: string; last_message_at: Date; other_id: string; other_name: string; other_handle: string; other_seed: number; other_avatar: string | null;
    last_body: string; last_kind: string; last_sender: string; unread: boolean;
  }>(sql`
    select c.id, c.last_message_at, o.id as other_id, o.display_name as other_name, o.handle as other_handle, o.avatar_seed as other_seed, o.avatar_url as other_avatar,
      lm.body as last_body, lm.kind as last_kind, lm.sender_id as last_sender,
      exists (select 1 from messages m where m.conversation_id = c.id and m.sender_id <> ${profileId} and (me.last_read_at is null or m.created_at > me.last_read_at)) as unread
    from conversation_participants me
    join conversations c on c.id = me.conversation_id
    join conversation_participants cp on cp.conversation_id = c.id and cp.profile_id <> ${profileId}
    join creator_profiles o on o.id = cp.profile_id
    left join lateral (select body, kind, sender_id from messages m where m.conversation_id = c.id order by created_at desc limit 1) lm on true
    where me.profile_id = ${profileId}
    order by c.last_message_at desc`);
}

export async function threadFor(conversationId: string, profileId: string) {
  const parts = await db.select({ profileId: s.conversationParticipants.profileId }).from(s.conversationParticipants)
    .where(eq(s.conversationParticipants.conversationId, conversationId));
  if (!parts.some((p) => p.profileId === profileId)) return null;
  const msgs = await db.select().from(s.messages).where(eq(s.messages.conversationId, conversationId)).orderBy(asc(s.messages.createdAt));

  // Resolve rich-message references in bulk.
  const ids = (kinds: string[]) => [...new Set(msgs.filter((m) => kinds.includes(m.kind) && m.refId).map((m) => m.refId!))];
  const projectIds = ids(["project_invite", "project_link"]);
  const oppIds = ids(["opportunity_link"]);
  const profileIds = ids(["profile_link"]);
  const [projects, opps, profiles, memberships] = await Promise.all([
    projectIds.length ? db.select({ id: s.projects.id, slug: s.projects.slug, title: s.projects.title, status: s.projects.status, artSeed: s.projects.artSeed, artworkUrl: s.projects.artworkUrl, demoUrl: s.projects.demoUrl })
      .from(s.projects).where(inArray(s.projects.id, projectIds)) : [],
    oppIds.length ? db.select({ id: s.opportunities.id, title: s.opportunities.title, category: s.opportunities.category, status: s.opportunities.status, budget: s.opportunities.budgetAmount, currency: s.opportunities.currency, paid: s.opportunities.paid, deadline: s.opportunities.deadline })
      .from(s.opportunities).where(inArray(s.opportunities.id, oppIds)) : [],
    profileIds.length ? db.select({ id: s.creatorProfiles.id, handle: s.creatorProfiles.handle, displayName: s.creatorProfiles.displayName, avatarSeed: s.creatorProfiles.avatarSeed, avatarUrl: s.creatorProfiles.avatarUrl, city: s.creatorProfiles.city, availability: s.creatorProfiles.availability })
      .from(s.creatorProfiles).where(inArray(s.creatorProfiles.id, profileIds)) : [],
    projectIds.length ? db.select().from(s.projectMembers).where(and(inArray(s.projectMembers.projectId, projectIds), eq(s.projectMembers.profileId, profileId))) : [],
  ]);
  const otherId = parts.find((p) => p.profileId !== profileId)?.profileId;
  const [other] = otherId ? await db.select().from(s.creatorProfiles).where(eq(s.creatorProfiles.id, otherId)) : [];

  await db.update(s.conversationParticipants).set({ lastReadAt: new Date() })
    .where(and(eq(s.conversationParticipants.conversationId, conversationId), eq(s.conversationParticipants.profileId, profileId)));

  return { msgs, other, projects, opps, profiles, memberships };
}
