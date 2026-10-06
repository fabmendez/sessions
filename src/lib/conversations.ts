import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";

export async function findOrCreateConversation(a: string, b: string) {
  const [row] = await db.execute<{ conversation_id: string }>(sql`
    select cp1.conversation_id from conversation_participants cp1
    join conversation_participants cp2 on cp1.conversation_id = cp2.conversation_id
    where cp1.profile_id = ${a} and cp2.profile_id = ${b}
      and (select count(*) from conversation_participants x where x.conversation_id = cp1.conversation_id) = 2
    limit 1`);
  if (row) return row.conversation_id;
  const [c] = await db.insert(s.conversations).values({}).returning();
  await db.insert(s.conversationParticipants).values([{ conversationId: c.id, profileId: a }, { conversationId: c.id, profileId: b }]);
  return c.id;
}
