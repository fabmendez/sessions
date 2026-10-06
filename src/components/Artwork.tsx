// Deterministic generative sleeve art. Gives every project/work sample a distinct cover
// with zero stock imagery. If a real artworkUrl exists it is used instead.
const PALETTES = [
  ["#2B2D42", "#EF8354", "#BFC0C0", "#F4E9D8"],
  ["#264653", "#2A9D8F", "#E9C46A", "#F4A261"],
  ["#3D348B", "#7678ED", "#F7B801", "#F18701"],
  ["#22223B", "#9A8C98", "#C9ADA7", "#F2E9E4"],
  ["#0D3B66", "#FAF0CA", "#F4D35E", "#EE964B"],
  ["#5F0F40", "#9A031E", "#FB8B24", "#E36414"],
  ["#1A535C", "#4ECDC4", "#F7FFF7", "#FF6B6B"],
  ["#283618", "#606C38", "#FEFAE0", "#DDA15E"],
  ["#370617", "#6A040F", "#D00000", "#FFBA08"],
  ["#03045E", "#0077B6", "#90E0EF", "#CAF0F8"],
  ["#3C1642", "#086375", "#1DD3B0", "#EEE5E9"],
  ["#2E1F27", "#854D27", "#DD7230", "#F4C95D"],
];

function rng(seed: number) {
  let s = (seed % 2147483647) || 1;
  return () => ((s = (s * 48271) % 2147483647) / 2147483647);
}

export function palette(seed: number) { return PALETTES[Math.abs(seed) % PALETTES.length]; }

export function Artwork({ seed, url, className = "", alt = "" }: { seed: number; url?: string | null; className?: string; alt?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={`aspect-square object-cover ${className}`} />;
  }
  const r = rng(seed + 11);
  const [a, b, c, d] = palette(seed);
  const kind = Math.floor(r() * 5);
  const els: React.ReactNode[] = [];

  if (kind === 0) {
    // record: offset concentric rings
    const cx = 35 + r() * 30, cy = 35 + r() * 30;
    for (let i = 9; i >= 1; i--) els.push(<circle key={i} cx={cx} cy={cy} r={i * 9} fill={i % 2 ? b : a} />);
    els.push(<circle key="l" cx={cx} cy={cy} r={11} fill={c} />, <circle key="h" cx={cx} cy={cy} r={1.6} fill={a} />);
  } else if (kind === 1) {
    // rotated stripes
    const rot = Math.floor(r() * 4) * 15 - 30;
    const cols = [b, c, d, b];
    els.push(<g key="s" transform={`rotate(${rot} 50 50)`}>{Array.from({ length: 14 }, (_, i) => (
      <rect key={i} x={-40 + i * 13} y={-20} width={6 + (i % 3) * 2} height={140} fill={cols[i % cols.length]} />
    ))}</g>);
  } else if (kind === 2) {
    // sun over horizon bands
    const sy = 38 + r() * 14;
    els.push(<circle key="sun" cx={30 + r() * 40} cy={sy} r={22 + r() * 8} fill={d} />);
    for (let i = 0; i < 5; i++) els.push(<rect key={i} x={0} y={60 + i * 9} width={100} height={4.5 - i * 0.6} fill={i % 2 ? b : c} />);
  } else if (kind === 3) {
    // bauhaus quarter circles, each clipped to its cell
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      const col = [b, c, d][Math.floor(r() * 3)];
      const q = Math.floor(r() * 4);
      els.push(
        <svg key={`${x}${y}`} x={x * 33.34} y={y * 33.34} width={33.34} height={33.34} viewBox="0 0 1 1" overflow="hidden">
          <circle cx={q === 1 || q === 2 ? 1 : 0} cy={q >= 2 ? 1 : 0} r={1} fill={col} />
        </svg>,
      );
    }
  } else {
    // waveform
    const n = 22;
    for (let i = 0; i < n; i++) {
      const h = 8 + Math.abs(Math.sin(i * 0.7 + r() * 2)) * 60 * (0.4 + r() * 0.6);
      els.push(<rect key={i} x={6 + i * 4} y={50 - h / 2} width={2.4} height={h} rx={1.2} fill={i % 5 === 0 ? d : c} />);
    }
    els.push(<rect key="b" x={0} y={84} width={100} height={16} fill={b} />);
  }

  return (
    <svg viewBox="0 0 100 100" role={alt ? "img" : "presentation"} aria-label={alt || undefined} className={`aspect-square ${className}`} preserveAspectRatio="xMidYMid slice">
      <rect width="100" height="100" fill={a} />
      {els}
    </svg>
  );
}
