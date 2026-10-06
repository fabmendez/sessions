import Link from "next/link";
export default function NotFound() {
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div>
        <p className="display text-6xl">Nothing on this track.</p>
        <p className="mt-3 text-muted">That page doesn't exist or was removed.</p>
        <Link href="/radar" className="btn-primary mt-6">Back to your Radar</Link>
      </div>
    </div>
  );
}
