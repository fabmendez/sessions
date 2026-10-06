"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";

export function FilterForm({ tab, q, placeholder, action, children }: { tab: string; q?: string; placeholder?: string; action?: { href: string; label: string }; children: React.ReactNode }) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const submit = () => {
    const f = new FormData(ref.current!);
    const params = new URLSearchParams();
    for (const [k, v] of f) if (String(v)) params.set(k, String(v));
    router.replace(`/discover?${params}`, { scroll: false });
  };
  return (
    <form ref={ref} onChange={submit} onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3" role="search">
      <input type="hidden" name="tab" value={tab} />
      <div className="flex flex-wrap items-center gap-2">
        {placeholder && (
          <input name="q" defaultValue={q} placeholder={placeholder} aria-label={placeholder}
            className="field h-10 max-w-xs rounded-full py-0 pl-4" onChange={(e) => e.stopPropagation()} onBlur={submit} />
        )}
        {children}
        <Link href={`/discover?tab=${tab}`} className="btn-quiet btn-sm">Clear</Link>
        {action && <Link href={action.href} className="btn-primary btn-sm ml-auto">{action.label}</Link>}
      </div>
    </form>
  );
}

type Pair = [string, string];
export function Select({ name, value, label, options, groups, sort }: { name: string; value?: string; label: string; options?: Pair[]; groups?: [string, Pair[]][]; sort?: boolean }) {
  return (
    <label className={`relative inline-flex h-10 items-center rounded-full border text-sm ${value ? "border-signal text-text" : "border-line text-muted"} hover:border-faint`}>
      <span className="sr-only">{sort ? "Sort by" : label}</span>
      <select name={name} defaultValue={value ?? ""} className="h-full max-w-[200px] cursor-pointer appearance-none truncate rounded-full bg-transparent pl-4 pr-8 focus:outline-none">
        <option value="">{sort ? `Sort: ${label}` : label}</option>
        {options?.map(([v, l]) => <option key={v} value={v}>{sort ? `Sort: ${l}` : l}</option>)}
        {groups?.map(([g, opts]) => <optgroup key={g} label={g}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</optgroup>)}
      </select>
      <svg viewBox="0 0 12 12" className="pointer-events-none absolute right-3 size-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M3 4.5l3 3 3-3" /></svg>
    </label>
  );
}

export function Toggle({ name, checked, label }: { name: string; checked: boolean; label: string }) {
  return (
    <label className="chip-toggle h-10">
      <input type="checkbox" name={name} value="1" defaultChecked={checked} className="sr-only" />
      {label}
    </label>
  );
}
