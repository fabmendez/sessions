import { palette } from "./Artwork";
import { initials } from "@/lib/format";

const SIZES = { xs: "size-6 text-[11px]", sm: "size-9 text-sm", md: "size-12 text-lg", lg: "size-20 text-3xl", xl: "size-28 sm:size-36 text-5xl" };

export function Avatar({ name, seed, url, size = "sm", className = "" }: { name: string; seed: number; url?: string | null; size?: keyof typeof SIZES; className?: string }) {
  const [a, , c, d] = palette(seed);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`${SIZES[size]} shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      aria-hidden
      className={`${SIZES[size]} display inline-grid shrink-0 place-items-center rounded-full ${className}`}
      style={{ background: `radial-gradient(circle at 30% 25%, ${d} 0 18%, ${c} 19% 48%, ${a} 49%)`, color: a === "#F7FFF7" ? "#111" : "#fff" }}
    >
      <span style={{ textShadow: "0 1px 6px rgba(0,0,0,.35)" }}>{initials(name)}</span>
    </span>
  );
}
