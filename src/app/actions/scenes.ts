"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireProfile } from "@/lib/auth";

export async function toggleScene(form: FormData) {
  const { profile } = await requireProfile();
  const sceneId = String(form.get("sceneId"));
  if (form.get("member") === "1") await db.delete(s.sceneMembers).where(and(eq(s.sceneMembers.sceneId, sceneId), eq(s.sceneMembers.profileId, profile.id)));
  else await db.insert(s.sceneMembers).values({ sceneId, profileId: profile.id }).onConflictDoNothing();
  revalidatePath("/", "layout");
}
