"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireUser, requireProfile } from "@/lib/auth";
import { cityByName, LOOKING_FOR } from "@/lib/taxonomy";
import { maybeUpload } from "@/lib/storage";

export type ProfileFormState = { error?: string; step?: number } | undefined;

const HANDLE = /^[a-z0-9][a-z0-9-]{1,23}$/;

export async function saveProfile(_: ProfileFormState, form: FormData): Promise<ProfileFormState> {
  const { user, profile: existing } = await requireUser();
  const mode = form.get("mode") === "edit" ? "edit" : "onboarding";
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const all = (k: string) => form.getAll(k).map(String).filter(Boolean);

  const displayName = get("displayName");
  const handle = get("handle").toLowerCase();
  const roleSlugs = all("roles");
  const genreSlugs = all("genres");
  const skillIds = all("skills");
  const lookingFor = all("lookingFor").filter((l) => LOOKING_FOR.some((x) => x.slug === l));
  const cityName = get("city");
  const remote = form.get("remote") === "on";
  const availability = get("availability") as "available" | "selective" | "busy";
  const bio = get("bio").slice(0, 400);

  if (!displayName) return { error: "Add the name you make music under.", step: 0 };
  if (!HANDLE.test(handle)) return { error: "Your handle can use lowercase letters, numbers and dashes (2–24 characters).", step: 0 };
  if (!roleSlugs.length) return { error: "Pick at least one thing you do.", step: 0 };
  if (!genreSlugs.length) return { error: "Pick at least one genre you make.", step: 1 };
  if (!cityName) return { error: "Add the city you're based in.", step: 2 };
  if (!lookingFor.length) return { error: "Pick at least one thing you're looking for.", step: 3 };
  if (!["available", "selective", "busy"].includes(availability)) return { error: "Choose your availability.", step: 6 };

  const [taken] = await db.select({ id: s.creatorProfiles.id }).from(s.creatorProfiles)
    .where(and(eq(s.creatorProfiles.handle, handle), existing ? ne(s.creatorProfiles.id, existing.id) : undefined));
  if (taken) return { error: `@${handle} is taken — try another handle.`, step: 0 };

  // Work samples
  const slots = Number(get("sampleSlots") || 0);
  const samples: { id?: string; title: string; creditRole: string; genreSlug: string; externalUrl: string | null; file: FormDataEntryValue | null; remove: boolean }[] = [];
  for (let i = 0; i < slots; i++) {
    const title = get(`s_title_${i}`);
    const id = get(`s_id_${i}`) || undefined;
    const remove = form.get(`s_remove_${i}`) === "on";
    if (!title && !id) continue;
    const link = get(`s_link_${i}`);
    if (link && !/^https?:\/\//.test(link)) return { error: `The link for "${title || "your work"}" needs to start with http:// or https://`, step: 5 };
    samples.push({ id, title, creditRole: get(`s_role_${i}`) || "Produced", genreSlug: get(`s_genre_${i}`), externalUrl: link || null, file: form.get(`s_file_${i}`), remove });
  }
  const kept = samples.filter((x) => !x.remove);
  if (!kept.length) return { error: "Add at least one piece of work — a link or an audio file. It's the first thing collaborators check.", step: 5 };
  if (kept.length > 5) return { error: "Feature up to 5 pieces of work.", step: 5 };
  for (const x of kept) {
    if (!x.title) return { error: "Give each piece of work a title.", step: 5 };
    const hasFile = x.file instanceof File && x.file.size > 0;
    if (!x.id && !x.externalUrl && !hasFile) return { error: `Add a link or an audio file for "${x.title}".`, step: 5 };
  }

  const city = cityByName(cityName);
  const [roleRows, genreRows] = await Promise.all([
    db.select().from(s.roles).where(inArray(s.roles.slug, roleSlugs)),
    db.select().from(s.genres),
  ]);
  const genreId = (slug: string) => genreRows.find((g) => g.slug === slug)?.id ?? null;

  let uploads: (string | null)[];
  try {
    uploads = await Promise.all(kept.map((x) => maybeUpload(x.file, "audio")));
  } catch (e) {
    return { error: (e as Error).message, step: 5 };
  }

  const values = {
    displayName, handle, bio, remote, availability, lookingFor,
    city: city?.name ?? cityName, country: city?.country ?? null, lat: city?.lat ?? null, lng: city?.lng ?? null,
  };

  await db.transaction(async (tx) => {
    let profileId = existing?.id;
    if (profileId) {
      await tx.update(s.creatorProfiles).set({ ...values, onboardedAt: existing!.onboardedAt ?? new Date() }).where(eq(s.creatorProfiles.id, profileId));
    } else {
      const [p] = await tx.insert(s.creatorProfiles).values({ ...values, userId: user.id, onboardedAt: new Date(), avatarSeed: Math.floor(Math.random() * 1e6) }).returning();
      profileId = p.id;
    }
    await tx.delete(s.profileRoles).where(eq(s.profileRoles.profileId, profileId));
    await tx.insert(s.profileRoles).values(roleSlugs.map((slug, i) => ({ profileId: profileId!, roleId: roleRows.find((r) => r.slug === slug)!.id, isPrimary: i === 0 })).filter((r) => r.roleId));
    await tx.delete(s.profileGenres).where(eq(s.profileGenres.profileId, profileId));
    await tx.insert(s.profileGenres).values(genreSlugs.map((g) => ({ profileId: profileId!, genreId: genreId(g)! })).filter((g) => g.genreId));
    await tx.delete(s.profileSkills).where(eq(s.profileSkills.profileId, profileId));
    if (skillIds.length) await tx.insert(s.profileSkills).values(skillIds.map((skillId) => ({ profileId: profileId!, skillId })));

    const removeIds = samples.filter((x) => x.remove && x.id).map((x) => x.id!);
    if (removeIds.length) await tx.delete(s.workSamples).where(and(eq(s.workSamples.profileId, profileId), inArray(s.workSamples.id, removeIds)));
    for (const [i, x] of kept.entries()) {
      const data = { title: x.title, creditRole: x.creditRole, genreId: genreId(x.genreSlug), externalUrl: x.externalUrl, position: i };
      if (x.id) {
        await tx.update(s.workSamples).set({ ...data, ...(uploads[i] ? { audioUrl: uploads[i] } : {}) })
          .where(and(eq(s.workSamples.id, x.id), eq(s.workSamples.profileId, profileId)));
      } else {
        await tx.insert(s.workSamples).values({ ...data, profileId, audioUrl: uploads[i], artSeed: Math.floor(Math.random() * 1e6) });
      }
    }
  });

  revalidatePath("/", "layout");
  redirect(mode === "edit" ? `/u/${handle}` : "/radar?welcome=1");
}

export async function setAvailability(form: FormData) {
  const { profile } = await requireProfile();
  const v = String(form.get("availability"));
  if (!["available", "selective", "busy"].includes(v)) return;
  await db.update(s.creatorProfiles).set({ availability: v as "available" }).where(eq(s.creatorProfiles.id, profile.id));
  revalidatePath("/", "layout");
}
