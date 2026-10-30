import { requireProfile } from "@/lib/auth";
import { unreadCount } from "@/lib/inbox";
import { Nav } from "@/components/Nav";
import { isAdmin, pendingReviewCount } from "@/lib/invites";
import { db } from "@/db";
import { creatorProfiles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireProfile();
  const admin = isAdmin(user.email);
  // cheap "recently active" signal for discover sorting
  if (Date.now() - profile.lastActiveAt.getTime() > 10 * 60_000) {
    await db.update(creatorProfiles).set({ lastActiveAt: sql`now()` }).where(eq(creatorProfiles.id, profile.id));
  }
  const [unread, reviews] = await Promise.all([unreadCount(profile.id), admin ? pendingReviewCount(db) : 0]);
  return (
    <>
      <Nav me={{ handle: profile.handle, name: profile.displayName, seed: profile.avatarSeed, avatarUrl: profile.avatarUrl, admin, reviews }} unread={unread} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-40 pt-6 sm:px-6 sm:pb-24 sm:pt-10">{children}</main>
    </>
  );
}
