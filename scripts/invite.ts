// Create an approved invite from the command line and print its link — how the first admin gets in on a fresh server.
//   npm run invite -- you@example.com
//   Docker: docker compose -p session exec -e APP_URL=http://YOUR-IP:PORT app npm run invite -- you@example.com
import "../src/db/env";
import { eq } from "drizzle-orm";
import { connect } from "../src/db/connect";
import { invites, users } from "../src/db/schema";
import { INVITE_TTL_DAYS, inviteUrl, issueLink, openInviteFor } from "../src/lib/invites";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage: npm run invite -- someone@example.com");
  process.exit(1);
}

const c = await connect({ max: 1 });
try {
  const [member] = await c.db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (member) { console.error(`${email} already has an account — they can log in.`); process.exit(1); }
  // Reuse an open invite for this email (approving it if it was waiting) rather than making a second one.
  const existing = await openInviteFor(c.db, email);
  const id = existing?.id ?? (await c.db.insert(invites).values({ email, note: "Created from the command line" }).returning())[0].id;
  const token = await issueLink(c.db, id, null);
  const base = process.env.APP_URL?.trim() || `http://localhost:${process.env.PORT ?? 3000}`;
  console.log(`\nInvite for ${email} (works for ${INVITE_TTL_DAYS} days):\n\n  ${inviteUrl(base, token!)}\n`);
  if (!process.env.APP_URL) console.log("(Set APP_URL to your site's address if that isn't it.)\n");
  const admins = (process.env.ADMIN_EMAILS ?? "").toLowerCase().split(",").map((e) => e.trim());
  if (!admins.includes(email)) console.log(`Tip: to make ${email} an admin, add it to ADMIN_EMAILS in .env and restart.\n`);
} finally {
  await c.close();
}
