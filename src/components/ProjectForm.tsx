"use client";
import { useActionState } from "react";
import { createProject, type ActionState } from "@/app/actions/projects";
import { CREDIT_ROLES, PROJECT_STATUSES } from "@/lib/taxonomy";

export function ProjectForm({ genres, scenes, defaultRole }: { genres: { slug: string; name: string }[]; scenes: { id: string; name: string }[]; defaultRole: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createProject, undefined);
  const fileCls = "field text-[13px] file:mr-3 file:rounded-full file:border-0 file:bg-raised file:px-3 file:py-1 file:text-text";
  return (
    <form action={action} className="space-y-6" encType="multipart/form-data">
      <div><label className="label" htmlFor="title">Project name</label><input id="title" name="title" required className="field text-lg" placeholder="After Hours Choir" /></div>
      <div><label className="label" htmlFor="description">What is it?</label>
        <textarea id="description" name="description" rows={3} className="field" placeholder="What it sounds like, where it's at, what it still needs." /></div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div><label className="label" htmlFor="genre">Genre</label>
          <select id="genre" name="genre" className="field" defaultValue=""><option value="">Choose</option>{genres.map((g) => <option key={g.slug} value={g.slug}>{g.name}</option>)}</select></div>
        <div><label className="label" htmlFor="status">Stage</label>
          <select id="status" name="status" className="field" defaultValue="idea">{PROJECT_STATUSES.filter((x) => !["finished", "released"].includes(x.slug)).map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select></div>
        <div><label className="label" htmlFor="myRole">Your role</label>
          <select id="myRole" name="myRole" className="field" defaultValue={defaultRole}>{CREDIT_ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div><label className="label" htmlFor="demo">Demo (audio)</label><input id="demo" name="demo" type="file" accept="audio/*" className={fileCls} /></div>
        <div><label className="label" htmlFor="artwork">Artwork (optional)</label><input id="artwork" name="artwork" type="file" accept="image/*" className={fileCls} />
          <p className="mt-1 text-[12px] text-faint">Skip it and we'll generate a cover.</p></div>
      </div>
      {scenes.length > 0 && (
        <div><label className="label" htmlFor="sceneId">Scene</label>
          <select id="sceneId" name="sceneId" className="field sm:max-w-xs" defaultValue=""><option value="">None</option>{scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      )}
      {state?.error && <p role="alert" className="text-sm text-stop">{state.error}</p>}
      <div className="flex justify-end border-t border-line-soft pt-6"><button className="btn-primary" disabled={pending}>{pending ? "Creating…" : "Start project"}</button></div>
    </form>
  );
}
