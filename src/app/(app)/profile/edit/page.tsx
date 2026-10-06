import { requireProfile } from "@/lib/auth";
import { taxonomyOptions } from "@/lib/options";
import { loadProfiles } from "@/lib/profiles";
import { ProfileForm } from "@/components/ProfileForm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata = { title: "Edit profile" };

export default async function EditProfilePage() {
  const { profile } = await requireProfile();
  const [[p], opts, skillRows, genreRows] = await Promise.all([
    loadProfiles([profile.id]), taxonomyOptions(),
    db.select({ id: s.profileSkills.skillId }).from(s.profileSkills).where(eq(s.profileSkills.profileId, profile.id)),
    db.select().from(s.genres),
  ]);
  return (
    <>
      <h1 className="display mb-10 text-5xl sm:mx-auto sm:max-w-2xl">Edit profile</h1>
      <ProfileForm
        mode="edit"
        {...opts}
        initial={{
          displayName: p.displayName, handle: p.handle, roles: p.roles.map((r) => r.slug), genres: p.genres.map((g) => g.slug),
          city: p.city ?? "", remote: p.remote, lookingFor: p.lookingFor, skills: skillRows.map((r) => r.id), availability: p.availability, bio: p.bio,
          samples: p.samples.map((w) => ({
            id: w.id, title: w.title, creditRole: w.creditRole, genre: genreRows.find((g) => g.name === w.genre)?.slug ?? "",
            externalUrl: w.externalUrl ?? "", hasAudio: !!w.audioUrl,
          })),
        }}
      />
    </>
  );
}
