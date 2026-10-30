import type { InviteState } from "@/lib/invites";

const STYLE: Record<InviteState, { label: string; cls: string }> = {
  requested: { label: "Waiting for approval", cls: "text-warn" },
  approved: { label: "Link ready", cls: "text-signal-text" },
  joined: { label: "Joined", cls: "text-ok" },
  expired: { label: "Link expired", cls: "text-faint" },
  declined: { label: "Declined", cls: "text-stop" },
};

export function InviteStatus({ state }: { state: InviteState }) {
  const s = STYLE[state];
  return <span className={`text-[13px] font-medium ${s.cls}`}>{s.label}</span>;
}
