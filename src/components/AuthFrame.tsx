import Link from "next/link";
import { Wordmark } from "./Nav";
import { Artwork } from "./Artwork";

export function AuthFrame({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/"><Wordmark /></Link>
        <div className="my-auto w-full max-w-sm py-12">
          <h1 className="display text-5xl">{title}</h1>
          <p className="mb-8 mt-2 text-muted">{sub}</p>
          {children}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-surface lg:block" aria-hidden>
        <div className="absolute inset-0 grid grid-cols-3 gap-3 p-3 opacity-90">
          {[311, 47, 902, 1203, 66, 5, 718, 1999, 42].map((s) => <Artwork key={s} seed={s} className="w-full rounded-lg" />)}
        </div>
      </div>
    </div>
  );
}
