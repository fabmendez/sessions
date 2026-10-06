"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "./Avatar";
import { logout } from "@/app/actions/auth";

type Me = { handle: string; name: string; seed: number; avatarUrl: string | null };

const LINKS = [
  { href: "/radar", label: "Radar", icon: RadarIcon },
  { href: "/discover", label: "Discover", icon: SearchIcon },
  { href: "/messages", label: "Messages", icon: ChatIcon },
];

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`display inline-flex items-baseline gap-1 text-[26px] ${className}`}>
      Session<span className="size-2 translate-y-[-2px] rounded-full bg-signal" aria-hidden />
    </span>
  );
}

export function Nav({ me, unread }: { me: Me; unread: number }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line-soft bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/radar" aria-label="Session home"><Wordmark /></Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={`relative rounded-full px-3.5 py-2 text-sm ${active(l.href) ? "bg-raised text-text" : "text-muted hover:text-text"}`}>
                {l.label}
                {l.href === "/messages" && unread > 0 && <Badge n={unread} />}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <details className="relative hidden sm:block [&[open]>summary]:bg-raised">
              <summary className="btn-primary btn-sm cursor-pointer list-none">Post</summary>
              <PostMenu className="absolute right-0 top-11 w-64" />
            </details>
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-full" aria-label="Account menu"><Avatar name={me.name} seed={me.seed} url={me.avatarUrl} /></summary>
              <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-line bg-raised p-1.5 shadow-2xl">
                <Link href={`/u/${me.handle}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-surface">Your profile</Link>
                <Link href="/profile/edit" className="block rounded-lg px-3 py-2 text-sm hover:bg-surface">Edit profile</Link>
                <form action={logout}><button className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surface hover:text-text">Log out</button></form>
              </div>
            </details>
          </div>
        </div>
      </header>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-line-soft bg-bg/95 backdrop-blur sm:hidden" aria-label="Primary">
        {LINKS.slice(0, 2).map((l) => <Tab key={l.href} {...l} on={active(l.href)} />)}
        <details className="relative grid place-items-center">
          <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-full bg-signal text-signal-ink" aria-label="Post">
            <svg viewBox="0 0 16 16" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" /></svg>
          </summary>
          <PostMenu className="fixed inset-x-3 bottom-20" />
        </details>
        <Tab {...LINKS[2]} on={active("/messages")} badge={unread} />
        <Tab href={`/u/${me.handle}`} label="Profile" icon={UserIcon} on={path === `/u/${me.handle}`} />
      </nav>
    </>
  );
}

function PostMenu({ className }: { className: string }) {
  return (
    <div className={`z-50 rounded-xl border border-line bg-raised p-1.5 shadow-2xl ${className}`}>
      <Link href="/opportunities/new" className="block rounded-lg px-3 py-2.5 hover:bg-surface">
        <span className="block text-sm font-medium">Post an open call</span>
        <span className="block text-[13px] text-muted">Find a vocalist, producer, engineer…</span>
      </Link>
      <Link href="/projects/new" className="block rounded-lg px-3 py-2.5 hover:bg-surface">
        <span className="block text-sm font-medium">Start a project</span>
        <span className="block text-[13px] text-muted">Give your track a home and invite people</span>
      </Link>
    </div>
  );
}

function Tab({ href, label, icon: Icon, on, badge }: { href: string; label: string; icon: () => React.ReactNode; on: boolean; badge?: number }) {
  return (
    <Link href={href} className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] ${on ? "text-text" : "text-faint"}`}>
      <Icon />
      {label}
      {!!badge && <Badge n={badge} className="right-[calc(50%-18px)] top-2" />}
    </Link>
  );
}

function Badge({ n, className = "-right-0.5 -top-0.5" }: { n: number; className?: string }) {
  return <span className={`absolute grid h-4 min-w-4 place-items-center rounded-full bg-signal px-1 text-[10px] font-semibold text-signal-ink ${className}`}>{n}</span>;
}

function RadarIcon() { return <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="M12 12l6-6" /></svg>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>; }
function ChatIcon() { return <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 5h16v11H9l-5 4z" /></svg>; }
function UserIcon() { return <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>; }
