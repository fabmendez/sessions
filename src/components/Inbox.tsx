import Link from "next/link";
import { inboxFor } from "@/lib/messaging";
import { timeAgo } from "@/lib/format";
import { Avatar } from "./Avatar";

const PREVIEW: Record<string, string> = {
  project_invite: "Sent a project invite", project_link: "Shared a project", opportunity_link: "Shared an open call", profile_link: "Shared a profile",
};

export async function Inbox({ profileId, activeId, className = "" }: { profileId: string; activeId?: string; className?: string }) {
  const rows = await inboxFor(profileId);
  return (
    <nav aria-label="Conversations" className={className}>
      {rows.length === 0 && <p className="px-2 py-6 text-sm text-muted">No conversations yet. Message someone from their profile or an open call.</p>}
      <ul className="space-y-1">
        {rows.map((c) => (
          <li key={c.id}>
            <Link href={`/messages/${c.id}`} aria-current={c.id === activeId ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl p-2.5 ${c.id === activeId ? "bg-raised" : "hover:bg-surface"}`}>
              <Avatar name={c.other_name} seed={c.other_seed} url={c.other_avatar} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`truncate ${c.unread ? "font-semibold" : ""}`}>{c.other_name}</p>
                  <span className="shrink-0 text-[12px] text-faint">{timeAgo(c.last_message_at)}</span>
                </div>
                <p className={`truncate text-[13px] ${c.unread ? "text-text" : "text-muted"}`}>
                  {c.last_sender === profileId ? "You: " : ""}{c.last_kind === "text" ? c.last_body : PREVIEW[c.last_kind]}
                </p>
              </div>
              {c.unread && <span className="size-2 shrink-0 rounded-full bg-signal" aria-label="Unread" />}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
