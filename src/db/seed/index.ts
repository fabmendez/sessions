import "../env";
import bcrypt from "bcryptjs";
import { connect } from "../connect";
import * as s from "../schema";
import { ROLES, GENRES, SKILLS, cityByName } from "../../lib/taxonomy";
import { CREATORS, SCENES, PROJECTS, OPPORTUNITIES, CONNECTIONS, CONVERSATIONS } from "./data";

const conn = await connect({ max: 1 });
const db = conn.db;

const NOW = Date.now();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000);
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000);
const slugify = (x: string) => x.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
let seedN = 7;
const nextSeed = () => (seedN = (seedN * 48271) % 2147483647);

async function main() {
  // wipe (order matters for FKs; cascade handles most)
  await conn.run(`truncate users, roles, genres, skills, scenes, conversations restart identity cascade`);

  const roleRows = await db.insert(s.roles).values(ROLES.map((r, i) => ({ slug: r.slug, name: r.name, sort: i }))).returning();
  const genreRows = await db.insert(s.genres).values(GENRES.map((g) => ({ slug: g.slug, name: g.name }))).returning();
  const skillRows = await db.insert(s.skills).values(SKILLS.flatMap((c) => c.names.map((n) => ({ slug: slugify(`${c.category}-${n}`), name: n, category: c.category })))).returning();
  const role = (slug: string) => roleRows.find((r) => r.slug === slug)!.id;
  const genre = (slug: string) => genreRows.find((g) => g.slug === slug)!.id;
  const skill = (name: string) => skillRows.find((x) => x.name === name)!.id;

  const hash = await bcrypt.hash("session", 10);
  const P: Record<string, string> = {};
  for (const c of CREATORS) {
    const [u] = await db.insert(s.users).values({ email: `${c.handle}@session.test`, passwordHash: hash, createdAt: daysAgo(c.joinedDaysAgo) }).returning();
    const city = cityByName(c.city)!;
    const [p] = await db.insert(s.creatorProfiles).values({
      userId: u.id, handle: c.handle, displayName: c.name, bio: c.bio, avatarSeed: nextSeed(),
      city: city.name, country: city.country, lat: city.lat, lng: city.lng, remote: c.remote,
      availability: c.availability, lookingFor: c.looking, onboardedAt: daysAgo(c.joinedDaysAgo),
      lastActiveAt: hoursAgo(c.activeDaysAgo * 24 + 2), createdAt: daysAgo(c.joinedDaysAgo),
    }).returning();
    P[c.handle] = p.id;
    await db.insert(s.profileRoles).values(c.roles.map((r, i) => ({ profileId: p.id, roleId: role(r), isPrimary: i === 0 })));
    await db.insert(s.profileGenres).values(c.genres.map((g) => ({ profileId: p.id, genreId: genre(g) })));
    await db.insert(s.profileSkills).values(c.skills.map((n) => ({ profileId: p.id, skillId: skill(n) })));
  }
  for (const c of CREATORS) {
    for (const [i, w] of c.samples.entries()) {
      const [ws] = await db.insert(s.workSamples).values({
        profileId: P[c.handle], title: w.title, creditRole: w.role, genreId: genre(w.genre), audioUrl: `/audio/${w.audio}.mp3`,
        artSeed: hashString(w.title.replace(/ \(.*\)$/, "")), collaboratorNote: w.note ?? null, position: i,
      }).returning();
      if (w.with?.length) await db.insert(s.workSampleCollaborators).values(w.with.map((h) => ({ workSampleId: ws.id, profileId: P[h] })));
    }
  }

  const SC: Record<string, string> = {};
  for (const sc of SCENES) {
    const [row] = await db.insert(s.scenes).values({
      slug: sc.slug, name: sc.name, description: sc.description, kind: sc.kind, city: sc.city, genreId: sc.genre ? genre(sc.genre) : null, artSeed: hashString(sc.slug),
    }).returning();
    SC[sc.slug] = row.id;
    await db.insert(s.sceneMembers).values(sc.members.map((h) => ({ sceneId: row.id, profileId: P[h] })));
  }

  const PR: Record<string, string> = {};
  for (const p of PROJECTS) {
    const [row] = await db.insert(s.projects).values({
      slug: p.slug, title: p.title, ownerId: P[p.owner], description: p.description, genreId: genre(p.genre), status: p.status,
      progress: p.progress, artSeed: hashString(p.title), demoUrl: `/audio/${p.demo}.mp3`, sceneId: p.scene ? SC[p.scene] : null,
      creditsIssuedAt: p.credits ? daysAgo(Math.max(1, p.daysAgo - 30)) : null, createdAt: daysAgo(p.daysAgo), updatedAt: daysAgo(Math.min(...p.activity.map((a) => a.daysAgo), p.daysAgo)),
    }).returning();
    PR[p.slug] = row.id;
    await db.insert(s.projectMembers).values(p.members.map((m) => ({
      projectId: row.id, profileId: P[m.who], role: m.role, status: m.status ?? "active", joinedAt: daysAgo(p.daysAgo - 1),
      invitedById: m.status === "invited" ? P[p.owner] : null,
    })));
    if (p.credits) {
      await db.insert(s.credits).values(p.members.filter((m) => m.status !== "invited").map((m) => {
        const confirmed = !(p.unconfirmed ?? []).includes(m.who);
        return { projectId: row.id, profileId: P[m.who], role: m.role, confirmed, confirmedAt: confirmed ? daysAgo(Math.max(0, p.daysAgo - 40)) : null };
      }));
    }
    await db.insert(s.projectActivity).values([
      { projectId: row.id, actorId: P[p.owner], kind: "created", body: "Started the project", createdAt: daysAgo(p.daysAgo) },
      ...p.activity.map((a) => ({ projectId: row.id, actorId: P[a.who], kind: a.kind, body: a.body, createdAt: daysAgo(a.daysAgo) })),
    ]);
    if (p.followers?.length) await db.insert(s.projectFollows).values(p.followers.map((h) => ({ projectId: row.id, profileId: P[h] })));
  }

  const OP: string[] = [];
  for (const o of OPPORTUNITIES) {
    const [row] = await db.insert(s.opportunities).values({
      authorId: P[o.author], projectId: o.project ? PR[o.project] : null, sceneId: o.scene ? SC[o.scene] : null,
      category: o.category as typeof s.opportunities.$inferInsert.category, title: o.title, projectSummary: o.projectSummary,
      lookingFor: o.lookingFor, style: o.style ?? null, bpm: o.bpm ?? null, musicalKey: o.key ?? null, paid: o.paid,
      budgetAmount: o.budget ?? null, currency: o.currency ?? "GBP",
      deadline: o.deadlineAt ? new Date(`${o.deadlineAt}T18:00:00Z`) : o.deadlineInDays ? new Date(NOW + o.deadlineInDays * 86_400_000) : null,
      remote: o.remote, city: o.city ?? cityByName(CREATORS.find((c) => c.handle === o.author)!.city)!.name,
      demoUrl: o.demo ? `/audio/${o.demo}.mp3` : null, createdAt: daysAgo(o.daysAgo),
    }).returning();
    OP.push(row.id);
    await db.insert(s.opportunityGenres).values(o.genres.map((g) => ({ opportunityId: row.id, genreId: genre(g) })));
    for (const [i, a] of (o.applications ?? []).entries()) {
      const [sample] = await db.select().from(s.workSamples).where(eqProfile(P[a.who])).limit(1);
      await db.insert(s.opportunityApplications).values({
        opportunityId: row.id, applicantId: P[a.who], message: a.message, proposedFee: a.fee ?? null,
        workSampleId: sample?.id ?? null, status: a.status ?? "pending", createdAt: hoursAgo(o.daysAgo * 20 - i * 5),
      });
    }
  }

  for (const [a, b, status] of CONNECTIONS) {
    await db.insert(s.connections).values({ requesterId: P[a], addresseeId: P[b], status, createdAt: daysAgo(status === "pending" ? 1 : 90), respondedAt: status === "accepted" ? daysAgo(88) : null });
  }

  for (const conv of CONVERSATIONS) {
    const last = Math.min(...conv.messages.map((m) => m.hoursAgo));
    const [c] = await db.insert(s.conversations).values({ createdAt: hoursAgo(Math.max(...conv.messages.map((m) => m.hoursAgo))), lastMessageAt: hoursAgo(last) }).returning();
    await db.insert(s.conversationParticipants).values(conv.between.map((h) => ({
      conversationId: c.id, profileId: P[h],
      // lewis (demo) has read his older threads; recent ones stay unread
      lastReadAt: h === "lewis" && last > 40 ? hoursAgo(last - 1) : conv.messages.at(-1)!.from === h ? hoursAgo(last) : null,
    })));
    await db.insert(s.messages).values(conv.messages.map((m) => {
      const kind = m.kind ?? "text";
      const refId = !m.ref ? null : kind === "profile_link" ? P[m.ref] : kind === "opportunity_link" ? OP[Number(m.ref)] : PR[m.ref];
      return { conversationId: c.id, senderId: P[m.from], kind, body: m.body ?? "", refId, refRole: m.role ?? null, createdAt: hoursAgo(m.hoursAgo) };
    }));
  }

  console.log(`Seeded ${CREATORS.length} creators, ${PROJECTS.length} projects, ${OPPORTUNITIES.length} open calls, ${SCENES.length} scenes.`);
  console.log(`Log in as lewis@session.test / session (every seeded account uses the password "session").`);
}

import { eq } from "drizzle-orm";
const eqProfile = (id: string) => eq(s.workSamples.profileId, id);
function hashString(str: string) { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return Math.abs(h); }

await main();
await conn.close();
