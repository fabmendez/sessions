import { and, eq, sql } from "drizzle-orm";
import { requireProfile } from "@/lib/auth";
import { taxonomyOptions } from "@/lib/options";
import { db } from "@/db";
import * as s from "@/db/schema";
import { OpportunityForm } from "@/components/OpportunityForm";

export const metadata = { title: "Post an open call" };

export default async function NewOpportunityPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const { profile } = await requireProfile();
  const { project } = await searchParams;
  const [opts, projects, scenes] = await Promise.all([
    taxonomyOptions(),
    db.select({ id: s.projects.id, title: s.projects.title }).from(s.projects)
      .where(and(eq(s.projects.ownerId, profile.id), sql`${s.projects.status} in ('idea','recruiting','in_progress','mixing')`)),
    db.select({ id: s.scenes.id, name: s.scenes.name }).from(s.scenes).innerJoin(s.sceneMembers, eq(s.sceneMembers.sceneId, s.scenes.id)).where(eq(s.sceneMembers.profileId, profile.id)),
  ]);
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-[44px] sm:text-[56px]">Post an open call</h1>
      <p className="mb-10 mt-2 text-muted">Be specific. Calls with a BPM, a budget and a demo get far better applications.</p>
      <OpportunityForm genres={opts.genres} projects={projects} scenes={scenes} defaultProject={project} city={profile.city ?? ""} />
    </div>
  );
}
