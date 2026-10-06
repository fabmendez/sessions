"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

export function AuthForm({ action, submit, demo }: { action: (s: FormState, f: FormData) => Promise<FormState>; submit: string; demo?: boolean }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" defaultValue={demo ? "lewis@session.test" : undefined} />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete={demo ? "current-password" : "new-password"} required minLength={demo ? 1 : 8} className="field" defaultValue={demo ? "session" : undefined} />
      </div>
      {state?.error && <p role="alert" className="text-sm text-stop">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "One moment…" : submit}</button>
    </form>
  );
}
