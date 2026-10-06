import { requireProfile } from "@/lib/auth";
import { unreadCount } from "@/lib/inbox";
import { Nav } from "@/components/Nav";
import { db } from "@/db";
import { creatorProfiles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();
  // cheap "recently active" signal for discover sorting
  if (Date.now() - profile.lastActiveAt.getTime() > 10 * 60_000) {
    await db.update(creatorProfiles).set({ lastActiveAt: sql`now()` }).where(eq(creatorProfiles.id, profile.id));
  }
  const unread = await unreadCount(profile.id);
  return (
    <>
      <Nav me={{ handle: profile.handle, name: profile.displayName, seed: profile.avatarSeed, avatarUrl: profile.avatarUrl }} unread={unread} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-40 pt-6 sm:px-6 sm:pb-24 sm:pt-10">{children}</main>
    </>
  );
}
