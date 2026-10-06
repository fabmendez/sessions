import { eq } from "drizzle-orm";
import { requireProfile } from "@/lib/auth";
import { loadProfiles } from "@/lib/profiles";
import { taxonomyOptions } from "@/lib/options";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ProjectForm } from "@/components/ProjectForm";

export const metadata = { title: "Start a project" };

const ROLE_TO_CREDIT: Record<string, string> = {
  producer: "Produced", vocalist: "Vocals", songwriter: "Songwriting", "mix-engineer": "Mixed", "mastering-engineer": "Mastered", dj: "DJ Edit",
};

export default async function NewProjectPage() {
  const { profile } = await requireProfile();
  const [[me], opts, scenes] = await Promise.all([
    loadProfiles([profile.id]), taxonomyOptions(),
    db.select({ id: s.scenes.id, name: s.scenes.name }).from(s.scenes).innerJoin(s.sceneMembers, eq(s.sceneMembers.sceneId, s.scenes.id)).where(eq(s.sceneMembers.profileId, profile.id)),
  ]);
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-[44px] sm:text-[56px]">Start a project</h1>
      <p className="mb-10 mt-2 text-muted">A home for one track or record: who's on it, what it needs, and the credits when it's done.</p>
      <ProjectForm genres={opts.genres} scenes={scenes} defaultRole={ROLE_TO_CREDIT[me.roles[0]?.slug] ?? "Produced"} />
    </div>
  );
}
