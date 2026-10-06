import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { SKILLS } from "./taxonomy";

export async function taxonomyOptions() {
  const [roles, genres, skills] = await Promise.all([
    db.select().from(s.roles).orderBy(asc(s.roles.sort)),
    db.select().from(s.genres).orderBy(asc(s.genres.name)),
    db.select().from(s.skills),
  ]);
  return {
    roles: roles.map((r) => ({ slug: r.slug, name: r.name })),
    genres: genres.map((g) => ({ slug: g.slug, name: g.name })),
    skills: SKILLS.map((c) => ({
      category: c.category,
      items: c.names.map((n) => skills.find((k) => k.category === c.category && k.name === n)).filter(Boolean).map((k) => ({ id: k!.id, name: k!.name })),
    })),
  };
}
