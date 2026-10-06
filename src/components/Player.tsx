"use client";
// One shared audio element for the whole app: starting a preview stops the last one,
// and the mini player keeps playing while you browse.
import { createContext, useContext, useEffect, useRef, useState } from "react";

type Track = { src: string; title: string; by?: string };
type Ctx = { track: Track | null; playing: boolean; progress: number; toggle: (t: Track) => void; stop: () => void };
const PlayerCtx = createContext<Ctx | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const a = new Audio();
    a.preload = "none";
    a.addEventListener("play", () => setPlaying(true));
    a.addEventListener("pause", () => setPlaying(false));
    a.addEventListener("ended", () => { setPlaying(false); setProgress(0); });
    a.addEventListener("timeupdate", () => setProgress(a.duration ? a.currentTime / a.duration : 0));
    audio.current = a;
    return () => a.pause();
  }, []);

  const toggle = (t: Track) => {
    const a = audio.current;
    if (!a) return;
    if (track?.src === t.src) { if (a.paused) a.play(); else a.pause(); return; }
    a.src = t.src;
    setTrack(t);
    setProgress(0);
    a.play().catch(() => setPlaying(false));
  };
  const stop = () => { audio.current?.pause(); setTrack(null); };

  return (
    <PlayerCtx.Provider value={{ track, playing, progress, toggle, stop }}>
      {children}
      {track && (
        <div className="fixed inset-x-0 bottom-[64px] z-40 px-3 sm:bottom-4 sm:left-auto sm:right-4 sm:w-[360px] sm:px-0">
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-raised/95 p-2 pr-3 shadow-2xl backdrop-blur">
            <button onClick={() => toggle(track)} className="grid size-10 shrink-0 place-items-center rounded-full bg-signal text-signal-ink" aria-label={playing ? "Pause" : "Play"}>
              {playing ? <PauseGlyph /> : <PlayGlyph />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{track.title}</p>
              {track.by && <p className="truncate text-[12px] text-muted">{track.by}</p>}
              <div className="mt-1.5 h-0.5 rounded bg-line"><div className="h-full rounded bg-signal" style={{ width: `${progress * 100}%` }} /></div>
            </div>
            <button onClick={stop} className="btn-quiet btn-sm px-2" aria-label="Close player">✕</button>
          </div>
        </div>
      )}
    </PlayerCtx.Provider>
  );
}

const PlayGlyph = () => <svg viewBox="0 0 16 16" className="size-4 translate-x-px" fill="currentColor" aria-hidden><path d="M4 2.5v11l9-5.5z" /></svg>;
const PauseGlyph = () => <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" /></svg>;

export function PlayButton({ src, title, by, size = "md", className = "" }: Track & { size?: "sm" | "md" | "lg"; className?: string }) {
  const ctx = useContext(PlayerCtx);
  const active = ctx?.track?.src === src && ctx.playing;
  const dims = size === "lg" ? "size-14" : size === "sm" ? "size-8" : "size-10";
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); ctx?.toggle({ src, title, by }); }}
      className={`${dims} grid shrink-0 place-items-center rounded-full bg-signal text-signal-ink shadow-lg transition-transform hover:scale-105 ${className}`}
      aria-label={active ? `Pause ${title}` : `Play ${title}`}
    >
      {active ? <Eq /> : <PlayGlyph />}
    </button>
  );
}

function Eq() {
  return (
    <span className="flex h-4 items-end gap-[2px]" aria-hidden>
      {[0, 200, 400].map((d) => <span key={d} className="eq-bar block w-[3px] h-full rounded-sm bg-current" style={{ animationDelay: `${d}ms` }} />)}
    </span>
  );
}
