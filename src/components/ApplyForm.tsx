"use client";
import { useActionState } from "react";
import { applyToOpportunity, type ActionState } from "@/app/actions/opportunities";

export function ApplyForm({ opportunityId, samples, paid, currency, budget }: {
  opportunityId: string; samples: { id: string; title: string; creditRole: string }[]; paid: boolean; currency: string; budget: number | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(applyToOpportunity, undefined);
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : "£";
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <div>
        <label className="label" htmlFor="message">Your note</label>
        <textarea id="message" name="message" rows={5} required minLength={10} maxLength={1200} className="field"
          placeholder="What would you bring to it? How quickly could you deliver?" />
      </div>
      {samples.length > 0 && (
        <div>
          <label className="label" htmlFor="workSampleId">Most relevant work</label>
          <select id="workSampleId" name="workSampleId" className="field" defaultValue={samples[0].id}>
            {samples.map((w) => <option key={w.id} value={w.id}>{w.title} — {w.creditRole}</option>)}
            <option value="">Don't attach anything</option>
          </select>
        </div>
      )}
      {paid && (
        <div>
          <label className="label" htmlFor="proposedFee">Your fee</label>
          <div className="flex items-center rounded-lg border border-line bg-surface focus-within:border-signal">
            <span className="pl-3 text-faint">{symbol}</span>
            <input id="proposedFee" name="proposedFee" inputMode="numeric" defaultValue={budget ?? undefined} className="w-full bg-transparent py-2.5 pl-1 pr-3 focus:outline-none" />
          </div>
          <p className="mt-1 text-[12px] text-faint">Leave it at the budget, or propose your own.</p>
        </div>
      )}
      {state?.error && <p role="alert" className="text-sm text-stop">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Apply"}</button>
    </form>
  );
}
