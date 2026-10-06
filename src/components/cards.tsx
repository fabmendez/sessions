import Link from "next/link";
import type { ProfileSummary } from "@/lib/profiles";
import type { Match } from "@/lib/match";
import type { OpportunitySummary, ProjectSummary } from "@/lib/work";
import { LOOKING_FOR, categoryName } from "@/lib/taxonomy";
import { deadlineText, money, plural, timeAgo } from "@/lib/format";
import { Avatar } from "./Avatar";
import { Artwork } from "./Artwork";
import { PlayButton } from "./Player";
import { Availability, MatchLine, StatusTag } from "./bits";

export function CreatorCard({ p, match }: { p: ProfileSummary; match?: Match }) {
  const work = p.samples.slice(0, 3);
  return (
    <article className="panel relative flex flex-col p-5 transition-colors hover:bg-raised">
      <div className="flex items-start gap-4">
        <Avatar name={p.displayName} seed={p.avatarSeed} url={p.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="display text-[26px] leading-tight">
            <Link href={`/u/${p.handle}`} className="after:absolute after:inset-0 after:content-['']">{p.displayName}</Link>
          </h3>
          <p className="text-sm">{p.roles.map((r) => r.name).join(", ")}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted">
            <Availability value={p.availability} />
            <span>{p.city}</span>
            {p.remote && <span>Remote OK</span>}
          </p>
        </div>
      </div>

      {match && <MatchLine match={match} className="mt-4" />}

      <p className="mt-3 text-[13px] text-muted">{p.genres.map((g) => g.name).join(" / ")}</p>

      {work.length > 0 && (
        <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
          {work.map((w) => (
            <div key={w.id}>
              <div className="relative">
                <Artwork seed={w.artSeed} url={w.artworkUrl} alt={w.title} className="block w-full rounded-md" />
                {w.audioUrl && <PlayButton src={w.audioUrl} title={w.title} by={p.displayName} size="sm" className="absolute bottom-1.5 right-1.5" />}
              </div>
              <p className="mt-1 truncate text-[12px] text-muted" title={`${w.title} — ${w.creditRole}`}>{w.creditRole}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft pt-3 text-[13px] text-muted">
          <span><span className="text-text">{p.stats.completed}</span> completed</span>
          <span><span className="text-text">{p.stats.repeat}</span> repeat collaborator{p.stats.repeat === 1 ? "" : "s"}</span>
        </div>
        {p.lookingFor.length > 0 && (
          <p className="mt-2 text-[13px] text-muted">Looking for <span className="text-text">{p.lookingFor.slice(0, 3).map((l) => LOOKING_FOR.find((x) => x.slug === l)?.name.toLowerCase() ?? l).join(", ")}</span></p>
        )}
      </div>
    </article>
  );
}

/** The open-call spec sheet: the facts that decide "is this worth applying for?" */
export function OpportunitySpec({ o, dense = false }: { o: OpportunitySummary; dense?: boolean }) {
  const rows: [string, string | null][] = [
    ["Track", [o.bpm ? `${o.bpm} BPM` : null, o.musicalKey].filter(Boolean).join(" · ") || null],
    ["Budget", o.paid ? money(o.budgetAmount, o.currency) ?? "Paid" : "Unpaid / credit"],
    ["Deadline", deadlineText(o.deadline)],
    ["Where", o.remote ? "Remote" : `In person, ${o.city}`],
  ];
  return (
    <dl className={`grid ${dense ? "grid-cols-2 gap-x-4 gap-y-2" : "grid-cols-2 gap-4 sm:grid-cols-4"}`}>
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <div key={k}>
          <dt className="text-[12px] text-faint">{k}</dt>
          <dd className={`font-mono text-[13px] ${k === "Budget" && o.paid ? "text-signal-text" : ""}`}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function OpportunityCard({ o, match }: { o: OpportunitySummary; match?: Match }) {
  return (
    <article className="panel relative flex flex-col p-5 transition-colors hover:bg-raised">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-signal-text">{categoryName(o.category)}</p>
        {o.myApplication && <span className="chip h-6 border-ok/60 text-ok">Applied</span>}
      </div>
      <h3 className="display mt-1 text-[26px] leading-tight">
        <Link href={`/opportunities/${o.id}`} className="after:absolute after:inset-0 after:content-['']">{o.title}</Link>
      </h3>
      <p className="mt-1 text-sm text-muted">{o.lookingFor}{o.style ? ` — ${o.style}` : ""}</p>
      {match && <MatchLine match={match} className="mt-3" />}
      <div className="mt-4 border-t border-line-soft pt-4"><OpportunitySpec o={o} dense /></div>
      <div className="mt-auto flex items-center gap-2 pt-4 text-[13px] text-muted">
        <Avatar name={o.author.displayName} seed={o.author.avatarSeed} url={o.author.avatarUrl} size="xs" />
        <span className="truncate">{o.author.displayName}</span>
        <span className="ml-auto shrink-0">{timeAgo(o.createdAt)} · {plural(o.applicationCount, "applicant")}</span>
      </div>
    </article>
  );
}

export function ProjectCard({ p, note }: { p: ProjectSummary; note?: React.ReactNode }) {
  const active = p.members.filter((m) => m.status === "active");
  return (
    <article className="group relative">
      <div className="relative">
        <Artwork seed={p.artSeed} url={p.artworkUrl} alt={`Artwork for ${p.title}`} className="w-full rounded-xl" />
        {p.demoUrl && <PlayButton src={p.demoUrl} title={p.title} by={p.owner.displayName} className="absolute bottom-3 right-3 z-10" />}
        <span className="absolute left-3 top-3"><span className="rounded-full bg-bg/85 backdrop-blur"><StatusTag status={p.status} /></span></span>
      </div>
      <h3 className="display mt-3 text-[26px] leading-tight">
        <Link href={`/projects/${p.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:underline">{p.title}</Link>
      </h3>
      <p className="text-sm text-muted">{p.genre?.name}{p.genre ? " · " : ""}{active.map((m) => m.displayName.split(" ")[0]).join(", ")}</p>
      {p.openRoles.length > 0 && (
        <p className="mt-1.5 text-[13px] text-signal-text">Needs: {p.openRoles.map((r) => categoryName(r.category).replace(" wanted", "").toLowerCase()).join(", ")}</p>
      )}
      {note}
    </article>
  );
}
