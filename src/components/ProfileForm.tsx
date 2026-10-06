"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveProfile, type ProfileFormState } from "@/app/actions/profile";
import { AVAILABILITY, CITIES, CREDIT_ROLES, LOOKING_FOR } from "@/lib/taxonomy";

type Opt = { slug: string; name: string };
export type ProfileInitial = {
  displayName: string; handle: string; roles: string[]; genres: string[]; city: string; remote: boolean;
  lookingFor: string[]; skills: string[]; availability: string; bio: string;
  samples: { id: string; title: string; creditRole: string; genre: string; externalUrl: string; hasAudio: boolean }[];
};

const STEPS = [
  { q: "What do you do?", hint: "Pick everything that applies. The first one you pick shows as your main role." },
  { q: "What do you make?", hint: "Genres you'd want to be found for." },
  { q: "Where are you based?", hint: "Used to find people nearby. Only your city is shown." },
  { q: "What are you looking for?", hint: "This decides who and what shows up on your Radar." },
  { q: "What tools and skills do you use?", hint: "Optional, but it's how people filter for a Logic user or a tenor." },
  { q: "Show some work", hint: "Link or upload 1–3 pieces. This is the first thing a collaborator will check." },
  { q: "Are you available right now?", hint: "You can change this any time from your profile." },
];

export function ProfileForm({
  mode, initial, roles, genres, skills,
}: {
  mode: "onboarding" | "edit"; initial: ProfileInitial; roles: Opt[]; genres: Opt[]; skills: { category: string; items: { id: string; name: string }[] }[];
}) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveProfile, undefined);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const stepped = mode === "onboarding";
  const slots = Math.min(5, Math.max(3, initial.samples.length + 1));

  useEffect(() => { if (state?.step != null && stepped) setStep(state.step); }, [state, stepped]);

  const check = (i: number): string | null => {
    const f = new FormData(formRef.current!);
    if (i === 0) {
      if (!String(f.get("displayName")).trim()) return "Add the name you make music under.";
      if (!/^[a-z0-9][a-z0-9-]{1,23}$/.test(String(f.get("handle")).trim().toLowerCase())) return "Your handle can use lowercase letters, numbers and dashes.";
      if (!f.getAll("roles").length) return "Pick at least one thing you do.";
    }
    if (i === 1 && !f.getAll("genres").length) return "Pick at least one genre.";
    if (i === 2 && !String(f.get("city")).trim()) return "Add the city you're based in.";
    if (i === 3 && !f.getAll("lookingFor").length) return "Pick at least one thing you're looking for.";
    if (i === 5) {
      const ok = Array.from({ length: slots }).some((_, k) => {
        const t = String(f.get(`s_title_${k}`) ?? "").trim();
        const file = f.get(`s_file_${k}`);
        return t && (String(f.get(`s_link_${k}`) ?? "").trim() || (file instanceof File && file.size > 0) || f.get(`s_id_${k}`));
      });
      if (!ok) return "Add at least one piece of work with a title and a link or audio file.";
    }
    return null;
  };
  const next = () => {
    const err = check(step);
    setStepError(err);
    if (!err) { setStep((s) => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const show = (i: number) => (!stepped || i === step ? "" : "hidden");
  const error = stepError ?? state?.error;

  return (
    <form ref={formRef} action={action} className="mx-auto max-w-2xl" encType="multipart/form-data">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="sampleSlots" value={slots} />

      {stepped && (
        <div className="mb-10">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-signal" : "bg-line"}`} />)}
          </div>
          <p className="mt-3 text-[13px] text-muted">Step {step + 1} of {STEPS.length}</p>
        </div>
      )}

      {/* 1. Roles + identity */}
      <Section i={0} stepped={stepped} cls={show(0)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="displayName">Artist or creator name</label>
            <input id="displayName" name="displayName" defaultValue={initial.displayName} className="field" placeholder="e.g. Maya Okafor" />
          </div>
          <div>
            <label className="label" htmlFor="handle">Handle</label>
            <div className="flex items-center rounded-lg border border-line bg-surface focus-within:border-signal">
              <span className="pl-3 text-faint">@</span>
              <input id="handle" name="handle" defaultValue={initial.handle} className="w-full bg-transparent py-2.5 pl-1 pr-3 text-[15px] focus:outline-none" placeholder="maya" />
            </div>
          </div>
        </div>
        <Chips name="roles" options={roles} selected={initial.roles} className="mt-6" />
      </Section>

      <Section i={1} stepped={stepped} cls={show(1)}>
        <Chips name="genres" options={genres} selected={initial.genres} />
      </Section>

      <Section i={2} stepped={stepped} cls={show(2)}>
        <label className="label" htmlFor="city">City</label>
        <input id="city" name="city" list="cities" defaultValue={initial.city} className="field max-w-sm" placeholder="Start typing — e.g. London" />
        <datalist id="cities">{CITIES.map((c) => <option key={c.name} value={c.name}>{c.country}</option>)}</datalist>
        <label className="mt-6 flex max-w-md cursor-pointer items-start gap-3 rounded-xl border border-line p-4 has-[:checked]:border-signal">
          <input type="checkbox" name="remote" defaultChecked={initial.remote} className="mt-1 size-4 accent-[var(--signal)]" />
          <span>
            <span className="block font-medium">Open to remote collaboration</span>
            <span className="block text-sm text-muted">Swap stems and record from home with people anywhere.</span>
          </span>
        </label>
      </Section>

      <Section i={3} stepped={stepped} cls={show(3)}>
        <Chips name="lookingFor" options={LOOKING_FOR.map((l) => ({ slug: l.slug, name: l.name }))} selected={initial.lookingFor} />
      </Section>

      <Section i={4} stepped={stepped} cls={show(4)}>
        <div className="space-y-6">
          {skills.map((g) => (
            <fieldset key={g.category}>
              <legend className="mb-2 text-sm font-medium">{g.category}</legend>
              <Chips name="skills" options={g.items.map((k) => ({ slug: k.id, name: k.name }))} selected={initial.skills} />
            </fieldset>
          ))}
        </div>
      </Section>

      <Section i={5} stepped={stepped} cls={show(5)}>
        <div className="space-y-4">
          {Array.from({ length: slots }).map((_, k) => <SampleSlot key={k} k={k} sample={initial.samples[k]} genres={genres} optional={k > 0} />)}
        </div>
      </Section>

      <Section i={6} stepped={stepped} cls={show(6)}>
        <div className="grid gap-3 sm:grid-cols-3">
          {AVAILABILITY.map((a) => (
            <label key={a.slug} className="cursor-pointer rounded-xl border border-line p-4 has-[:checked]:border-signal has-[:checked]:bg-raised">
              <input type="radio" name="availability" value={a.slug} defaultChecked={initial.availability === a.slug} className="sr-only" />
              <span className="block font-medium">{a.name}</span>
              <span className="block text-sm text-muted">{a.hint}</span>
            </label>
          ))}
        </div>
        <div className="mt-8">
          <label className="label" htmlFor="bio">Short bio</label>
          <textarea id="bio" name="bio" rows={3} maxLength={400} defaultValue={initial.bio} className="field" placeholder="What your music sounds like and how you like to work. Two or three sentences." />
        </div>
      </Section>

      {error && <p role="alert" className="mt-6 rounded-lg border border-stop/40 px-3 py-2 text-sm text-stop">{error}</p>}

      <div className="sticky bottom-16 z-20 -mx-4 mt-10 flex items-center justify-between gap-3 border-t border-line-soft bg-bg/95 px-4 py-4 backdrop-blur sm:bottom-0">
        {stepped ? (
          <>
            <button type="button" className="btn-quiet" onClick={() => { setStepError(null); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0}>Back</button>
            <div className="flex gap-2">
              {step === 4 && <button type="button" className="btn-quiet" onClick={() => setStep(5)}>Skip</button>}
              {step < STEPS.length - 1
                ? <button key="continue" type="button" className="btn-primary" onClick={next}>Continue</button>
                : <button key="finish" type="submit" className="btn-primary" disabled={pending}>{pending ? "Building your Radar…" : "Finish and see my Radar"}</button>}
            </div>
          </>
        ) : (
          <>
            <span className="text-sm text-muted">Changes show on your profile straight away.</span>
            <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
          </>
        )}
      </div>
    </form>
  );
}

function Section({ i, stepped, cls, children }: { i: number; stepped: boolean; cls: string; children: React.ReactNode }) {
  return (
    <section className={`${cls} ${stepped ? "" : "border-b border-line-soft py-10 first-of-type:pt-0"}`}>
      {stepped ? <h1 className="display text-[44px] sm:text-[56px]">{STEPS[i].q}</h1> : <h2 className="display text-[30px]">{STEPS[i].q}</h2>}
      <p className="mb-8 mt-2 text-muted">{STEPS[i].hint}</p>
      {children}
    </section>
  );
}

function Chips({ name, options, selected, className = "" }: { name: string; options: Opt[]; selected: string[]; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((o) => (
        <label key={o.slug} className="chip-toggle">
          <input type="checkbox" name={name} value={o.slug} defaultChecked={selected.includes(o.slug)} className="sr-only" />
          {o.name}
        </label>
      ))}
    </div>
  );
}

function SampleSlot({ k, sample, genres, optional }: { k: number; sample?: ProfileInitial["samples"][number]; genres: Opt[]; optional: boolean }) {
  return (
    <fieldset className="rounded-2xl border border-line p-4 sm:p-5">
      <legend className="px-1 text-sm font-medium">{sample ? sample.title : optional ? "Another piece (optional)" : "Your best piece"}</legend>
      {sample && <input type="hidden" name={`s_id_${k}`} value={sample.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_160px]">
        <input name={`s_title_${k}`} defaultValue={sample?.title} placeholder="Track title" className="field" aria-label="Track title" />
        <select name={`s_role_${k}`} defaultValue={sample?.creditRole ?? "Produced"} className="field" aria-label="Your role on it">
          {CREDIT_ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select name={`s_genre_${k}`} defaultValue={sample?.genre ?? ""} className="field" aria-label="Genre">
          <option value="">Genre</option>
          {genres.map((g) => <option key={g.slug} value={g.slug}>{g.name}</option>)}
        </select>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input name={`s_link_${k}`} defaultValue={sample?.externalUrl} placeholder="Link — SoundCloud, Bandcamp, YouTube…" className="field" aria-label="Link" />
        <label className="field flex cursor-pointer items-center gap-2 text-faint">
          <input type="file" name={`s_file_${k}`} accept="audio/*" className="w-full text-[13px] file:mr-3 file:rounded-full file:border-0 file:bg-raised file:px-3 file:py-1 file:text-text" />
        </label>
      </div>
      {sample && (
        <div className="mt-3 flex items-center justify-between text-[13px] text-muted">
          <span>{sample.hasAudio ? "Audio uploaded — choose a file to replace it." : "No audio yet."}</span>
          <label className="flex items-center gap-2"><input type="checkbox" name={`s_remove_${k}`} className="accent-[var(--stop)]" /> Remove</label>
        </div>
      )}
    </fieldset>
  );
}
