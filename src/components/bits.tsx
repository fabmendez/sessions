import Link from "next/link";
import type { Match } from "@/lib/match";

const AV = {
  available: { label: "Available", dot: "bg-ok", text: "text-ok" },
  selective: { label: "Selective", dot: "bg-warn", text: "text-warn" },
  busy: { label: "Busy", dot: "bg-stop", text: "text-stop" },
} as const;

export function Availability({ value, className = "" }: { value: keyof typeof AV; className?: string }) {
  const a = AV[value];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${a.text} ${className}`}>
      <span className={`size-2 rounded-full ${a.dot}`} />
      {a.label}
    </span>
  );
}

export function MatchLine({ match, className = "" }: { match: Match; className?: string }) {
  if (!match.reasons.length) return null;
  return (
    <p className={`text-[13px] leading-snug text-muted ${className}`}>
      <span className={match.label === "Strong match" ? "font-medium text-signal-text" : "font-medium text-text"}>{match.label}:</span>{" "}
      {match.reasons.join(" · ")}
    </p>
  );
}

export function TrustBadges({ stats, compact = false }: { stats: { completed: number; unique: number; repeat: number }; compact?: boolean }) {
  if (!stats.completed) return compact ? <span className="text-[13px] text-faint">No confirmed credits yet</span> : null;
  const items = [
    `${stats.completed} project${stats.completed === 1 ? "" : "s"} completed`,
    stats.repeat ? `${stats.repeat} repeat collaborator${stats.repeat === 1 ? "" : "s"}` : `${stats.unique} collaborator${stats.unique === 1 ? "" : "s"}`,
  ];
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
      <span className="inline-flex items-center gap-1 text-ok"><CheckIcon /> Credits confirmed</span>
      {items.map((i) => <span key={i}>{i}</span>)}
    </span>
  );
}

export const CheckIcon = ({ className = "size-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M3 8.5l3 3 7-7" /></svg>
);

export function Empty({ title, children, action }: { title: string; children?: React.ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</p>}
      {action && <Link href={action.href} className="btn-secondary btn-sm mt-4">{action.label}</Link>}
    </div>
  );
}

export function SectionHead({ title, href, linkText, sub }: { title: string; href?: string; linkText?: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="section-title">{title}</h2>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {href && <Link href={href} className="shrink-0 text-sm text-muted hover:text-text">{linkText ?? "See all"}</Link>}
    </div>
  );
}

export function StatusTag({ status }: { status: string }) {
  const map: Record<string, string> = {
    idea: "Idea", recruiting: "Recruiting", in_progress: "In progress", mixing: "Mixing", finished: "Finished", released: "Released",
  };
  const tone = status === "recruiting" ? "border-signal text-signal-text" : status === "released" || status === "finished" ? "border-ok/60 text-ok" : "border-line text-muted";
  return <span className={`inline-flex h-6 items-center rounded-full border px-2 text-[12px] font-medium ${tone}`}>{map[status] ?? status}</span>;
}
