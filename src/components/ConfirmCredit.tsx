import { confirmCredits } from "@/app/actions/projects";

export function ConfirmCredit({ creditIds, label = "Confirm this credit" }: { creditIds: string[]; label?: string }) {
  return (
    <form action={confirmCredits} className="inline">
      {creditIds.map((id) => <input key={id} type="hidden" name="creditId" value={id} />)}
      <button className="btn-primary btn-sm">{label}</button>
    </form>
  );
}
