"use client";
import { useActionState, useState } from "react";
import { createOpportunity, type ActionState } from "@/app/actions/opportunities";
import { KEYS, OPPORTUNITY_CATEGORIES } from "@/lib/taxonomy";

type Opt = { slug: string; name: string };

export function OpportunityForm({ genres, projects, scenes, defaultProject, city }: {
  genres: Opt[]; projects: { id: string; title: string }[]; scenes: { id: string; name: string }[]; defaultProject?: string; city: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createOpportunity, undefined);
  const [paid, setPaid] = useState(true);
  const [remote, setRemote] = useState(true);
  return (
    <form action={action} className="space-y-10" encType="multipart/form-data">
      <fieldset>
        <legend className="mb-3 font-medium">What do you need?</legend>
        <div className="flex flex-wrap gap-2">
          {OPPORTUNITY_CATEGORIES.map((c, i) => (
            <label key={c.slug} className="chip-toggle">
              <input type="radio" name="category" value={c.slug} defaultChecked={i === 0} className="sr-only" />{c.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5">
        <div><label className="label" htmlFor="title">Headline</label>
          <input id="title" name="title" required className="field" placeholder="Need a vocalist for an alt-R&B / garage track" /></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label className="label" htmlFor="projectSummary">The project</label>
            <input id="projectSummary" name="projectSummary" required className="field" placeholder="Alt-R&B / UK garage single" /></div>
          <div><label className="label" htmlFor="lookingFor">Looking for</label>
            <input id="lookingFor" name="lookingFor" required className="field" placeholder="Female/femme vocalist" /></div>
        </div>
        <div><label className="label" htmlFor="style">Style and scope</label>
          <input id="style" name="style" className="field" placeholder="Soulful vocal — topline + recording" /></div>
      </div>

      <fieldset>
        <legend className="mb-3 font-medium">Genres</legend>
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => <label key={g.slug} className="chip-toggle"><input type="checkbox" name="genres" value={g.slug} className="sr-only" />{g.name}</label>)}
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-3">
        <legend className="mb-3 font-medium sm:col-span-3">The track</legend>
        <div><label className="label" htmlFor="bpm">BPM</label><input id="bpm" name="bpm" inputMode="numeric" className="field font-mono" placeholder="132" /></div>
        <div><label className="label" htmlFor="key">Key</label>
          <select id="key" name="key" className="field" defaultValue=""><option value="">Not set</option>{KEYS.map((k) => <option key={k}>{k}</option>)}</select></div>
        <div><label className="label" htmlFor="demo">Demo (audio)</label>
          <input id="demo" name="demo" type="file" accept="audio/*" className="field text-[13px] file:mr-3 file:rounded-full file:border-0 file:bg-raised file:px-3 file:py-1 file:text-text" /></div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 font-medium sm:col-span-2">Terms</legend>
        <div>
          <span className="label">Pay</span>
          <div className="flex gap-2">
            <label className="chip-toggle"><input type="radio" name="paid" value="yes" checked={paid} onChange={() => setPaid(true)} className="sr-only" />Paid</label>
            <label className="chip-toggle"><input type="radio" name="paid" value="no" checked={!paid} onChange={() => setPaid(false)} className="sr-only" />Unpaid / credit</label>
          </div>
          {paid && (
            <div className="mt-3 flex gap-2">
              <select name="currency" className="field w-24" aria-label="Currency"><option>GBP</option><option>EUR</option><option>USD</option></select>
              <input name="budget" inputMode="numeric" className="field font-mono" placeholder="200" aria-label="Budget" />
            </div>
          )}
        </div>
        <div><label className="label" htmlFor="deadline">Deadline</label><input id="deadline" name="deadline" type="date" className="field" /></div>
        <div>
          <span className="label">Where</span>
          <div className="flex gap-2">
            <label className="chip-toggle"><input type="radio" name="remote" value="yes" checked={remote} onChange={() => setRemote(true)} className="sr-only" />Remote</label>
            <label className="chip-toggle"><input type="radio" name="remote" value="no" checked={!remote} onChange={() => setRemote(false)} className="sr-only" />In person</label>
          </div>
          {!remote && <input name="city" defaultValue={city} className="field mt-3" aria-label="City" />}
        </div>
      </fieldset>

      {(projects.length > 0 || scenes.length > 0) && (
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-3 font-medium sm:col-span-2">Connect it</legend>
          {projects.length > 0 && (
            <div><label className="label" htmlFor="projectId">Open role on a project</label>
              <select id="projectId" name="projectId" className="field" defaultValue={defaultProject ?? ""}>
                <option value="">Not linked to a project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <p className="mt-1 text-[12px] text-faint">Accepted applicants join the project automatically.</p></div>
          )}
          {scenes.length > 0 && (
            <div><label className="label" htmlFor="sceneId">Share in a scene</label>
              <select id="sceneId" name="sceneId" className="field" defaultValue=""><option value="">None</option>{scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          )}
        </fieldset>
      )}

      {state?.error && <p role="alert" className="rounded-lg border border-stop/40 px-3 py-2 text-sm text-stop">{state.error}</p>}
      <div className="flex justify-end border-t border-line-soft pt-6"><button className="btn-primary" disabled={pending}>{pending ? "Posting…" : "Post open call"}</button></div>
    </form>
  );
}
