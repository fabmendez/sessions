import "server-only";
import { sql } from "drizzle-orm";
import { db, exec } from "@/db";

export async function unreadCount(profileId: string) {
  const [r] = await exec<{ n: number }>(sql`
    select count(*)::int as n from conversation_participants cp
    where cp.profile_id = ${profileId} and exists (
      select 1 from messages m where m.conversation_id = cp.conversation_id and m.sender_id <> ${profileId}
        and (cp.last_read_at is null or m.created_at > cp.last_read_at))`);
  return r?.n ?? 0;
}
