"use client";
import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { InviteActionState } from "@/app/actions/invites";
import type { FormState } from "@/app/actions/auth";

type Action = (s: InviteActionState, f: FormData) => Promise<InviteActionState>;

/** Read-only link with a Copy button. Falls back to execCommand, since the Clipboard API needs HTTPS. */
export function CopyLink({ url }: { url: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(url); }
    catch { ref.current?.select(); document.execCommand("copy"); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex gap-2">
      <input ref={ref} readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="field min-w-0 flex-1 font-mono text-[13px]" aria-label="Invite link" />
      <button type="button" onClick={copy} className="btn-secondary shrink-0">{copied ? "Copied" : "Copy"}</button>
    </div>
  );
}

function Result({ state, onDone }: { state: InviteActionState; onDone?: () => void }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="text-sm text-stop">{state.error}</p>;
  return (
    <div className="space-y-2">
      {state.ok && <p className="text-sm text-ok">{state.ok}</p>}
      {state.url && <CopyLink url={state.url} />}
      {onDone && <button type="button" onClick={onDone} className="btn-quiet btn-sm">Done</button>}
    </div>
  );
}

export function InviteForm({ action, admin, disabled }: { action: Action; admin: boolean; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4" key={state?.ok ? state.ok + (state.url ?? "") : "form"}>
      <div>
        <label className="label" htmlFor="invite-email">Their email</label>
        <input id="invite-email" name="email" type="email" required className="field" placeholder="name@example.com" disabled={disabled} />
      </div>
      <div>
        <label className="label" htmlFor="invite-note">{admin ? "Note (optional)" : "Who are they?"}</label>
        <textarea id="invite-note" name="note" rows={2} maxLength={300} required={!admin} disabled={disabled} className="field resize-none"
          placeholder={admin ? "For your records" : "e.g. Vocalist I've worked with in Bristol — we did two tracks last year"} />
      </div>
      <button className="btn-primary" disabled={pending || disabled}>{pending ? "One moment…" : admin ? "Create invite" : "Send for approval"}</button>
      <Result state={state} />
    </form>
  );
}

/** A button that runs an invite action for one row and shows the link it returns (approve, new link). */
/** `children` are other controls for the row (e.g. Decline), hidden while a returned link is on screen. */
export function LinkAction({ action, id, label, primary, children }: { action: Action; id: string; label: string; primary?: boolean; children?: React.ReactNode }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, undefined);
  const [dismissed, setDismissed] = useState<InviteActionState>();
  const show = state && state !== dismissed;
  return (
    <div className={show ? "w-full space-y-2 sm:max-w-md" : "flex flex-wrap items-center gap-2"}>
      {!show && (
        <>
          <form action={formAction}>
            <input type="hidden" name="id" value={id} />
            <button className={`${primary ? "btn-primary" : "btn-secondary"} btn-sm`} disabled={pending}>{pending ? "…" : label}</button>
          </form>
          {children}
        </>
      )}
      {show && <Result state={state} onDone={() => { setDismissed(state); router.refresh(); }} />}
    </div>
  );
}

export function AcceptInviteForm({ action, token, email }: { action: (s: FormState, f: FormData) => Promise<FormState>; token: string; email: string }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" value={email} readOnly className="field text-muted" autoComplete="username" />
      </div>
      <div>
        <label className="label" htmlFor="password">Choose a password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="field" placeholder="At least 8 characters" />
      </div>
      {state?.error && <p role="alert" className="text-sm text-stop">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "One moment…" : "Create my account"}</button>
    </form>
  );
}
