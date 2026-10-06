// Explainable matching. Every point awarded comes with a human-readable reason,
// so the UI can say *why* someone is a match. Deliberately no follower/popularity input.
import { SEEKING_ROLE_MAP, categoryRole, ROLES } from "./taxonomy";

type MatchProfile = {
  id: string; city: string | null; country: string | null; lat: number | null; lng: number | null; remote: boolean;
  availability: "available" | "selective" | "busy"; lookingFor: string[]; lastActiveAt: Date;
  roles: { slug: string; name: string }[]; genres: { slug: string; name: string }[];
  stats: { completed: number; repeat: number };
};

export type Match = { score: number; label: "Strong match" | "Good match" | "Possible match"; reasons: string[] };

export function distanceKm(a: { lat: number | null; lng: number | null }, b: { lat: number | null; lng: number | null }) {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const roleNoun = (slug: string) => {
  const n = ROLES.find((r) => r.slug === slug)?.name ?? slug;
  return n === "Singer / Vocalist" ? "vocalist" : n.toLowerCase();
};

function label(score: number): Match["label"] {
  return score >= 60 ? "Strong match" : score >= 35 ? "Good match" : "Possible match";
}

export function matchCreator(me: MatchProfile, them: MatchProfile): Match {
  let score = 0;
  const reasons: string[] = [];

  // 1. Do they do what I'm looking for?
  const theirRoles = new Set(them.roles.map((r) => r.slug));
  const iNeed = me.lookingFor.flatMap((l) => SEEKING_ROLE_MAP[l] ?? []).filter((r) => theirRoles.has(r));
  if (iNeed.length) { score += 30; reasons.push(`you're looking for a ${roleNoun(iNeed[0])}`); }

  // 2. Do I do what they're looking for?
  const myRoles = new Set(me.roles.map((r) => r.slug));
  const theyNeed = them.lookingFor.flatMap((l) => SEEKING_ROLE_MAP[l] ?? []).filter((r) => myRoles.has(r));
  if (theyNeed.length) { score += 18; reasons.push(`they're looking for a ${roleNoun(theyNeed[0])}`); }

  // 3. Genre overlap
  const mine = new Set(me.genres.map((g) => g.slug));
  const shared = them.genres.filter((g) => mine.has(g.slug));
  if (shared.length) {
    score += Math.min(shared.length, 3) * 9;
    reasons.push(shared.length >= 2 ? "same genres" : `both make ${shared[0].name}`);
  }

  // 4. Geography
  const km = distanceKm(me, them);
  if (me.city && me.city === them.city) { score += 14; reasons.push("nearby"); }
  else if (km != null && km < 350) { score += 7; reasons.push(`${Math.round(km)} km away`); }
  else if (me.remote && them.remote) { score += 6; reasons.push("both work remotely"); }

  // 5. Availability
  if (them.availability === "available") { score += 10; reasons.push("available"); }
  else if (them.availability === "selective") score += 3;
  else score -= 12;

  // 6. Track record (confirmed credits only)
  if (them.stats.completed > 0) score += Math.min(them.stats.completed * 2, 8);
  if (them.stats.repeat > 0) score += 3;

  // 7. Recently around
  if (Date.now() - them.lastActiveAt.getTime() < 7 * 86_400_000) score += 3;

  return { score, label: label(score), reasons: reasons.slice(0, 4) };
}

type MatchOpportunity = {
  category: string; remote: boolean; city: string | null; paid: boolean; deadline: Date | null; genres: { slug: string; name: string }[];
};

/** How relevant is an open call to me? */
export function matchOpportunity(me: MatchProfile, o: MatchOpportunity): Match {
  let score = 0;
  const reasons: string[] = [];
  const wanted = categoryRole(o.category);
  if (wanted && me.roles.some((r) => r.slug === wanted)) { score += 40; reasons.push(`you're a ${roleNoun(wanted)}`); }
  else if (o.category === "remix" && me.roles.some((r) => r.slug === "dj")) { score += 25; reasons.push("you edit and remix"); }

  const mine = new Set(me.genres.map((g) => g.slug));
  const shared = o.genres.filter((g) => mine.has(g.slug));
  if (shared.length) { score += Math.min(shared.length, 2) * 10; reasons.push(shared.length > 1 ? "your genres" : `${shared[0].name}`); }

  if (o.remote && me.remote) { score += 8; reasons.push("remote"); }
  else if (!o.remote && o.city && o.city === me.city) { score += 12; reasons.push(`in ${o.city}`); }
  else if (!o.remote) score -= 20;

  if (o.paid && me.lookingFor.includes("paid-work")) { score += 10; reasons.push("paid"); }
  if (o.deadline && o.deadline.getTime() < Date.now()) score -= 50;

  return { score, label: label(score), reasons: reasons.slice(0, 4) };
}
