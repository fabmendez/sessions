import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { taxonomyOptions } from "@/lib/options";
import { ProfileForm } from "@/components/ProfileForm";
import { Wordmark } from "@/components/Nav";

export const metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const v = await requireUser();
  if (v.profile?.onboardedAt) redirect("/radar");
  const opts = await taxonomyOptions();
  const guess = v.user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20);
  return (
    <div className="px-4 pb-24 pt-6 sm:px-6">
      <div className="mx-auto mb-10 flex max-w-2xl items-center justify-between">
        <Link href="/"><Wordmark /></Link>
      </div>
      <ProfileForm
        mode="onboarding"
        {...opts}
        initial={{ displayName: "", handle: guess, roles: [], genres: [], city: "", remote: true, lookingFor: [], skills: [], availability: "available", bio: "", samples: [] }}
      />
    </div>
  );
}
