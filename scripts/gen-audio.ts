// Generates short synthesized demo loops for seed data (no copyrighted audio).
// Usage: npx tsx scripts/gen-audio.ts
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";

const SR = 22050;
const DUR = 10;

type Style = "garage" | "house" | "techno" | "rnb" | "afro" | "ambient" | "dnb" | "indie" | "hiphop" | "amapiano";
const LOOPS: { name: string; style: Style; bpm: number; root: number; minor: boolean; seed: number }[] = [
  { name: "garage-fsharp", style: "garage", bpm: 132, root: 42, minor: true, seed: 1 },
  { name: "house-c", style: "house", bpm: 124, root: 36, minor: false, seed: 2 },
  { name: "techno-a", style: "techno", bpm: 132, root: 33, minor: true, seed: 3 },
  { name: "rnb-eb", style: "rnb", bpm: 88, root: 39, minor: false, seed: 4 },
  { name: "afro-g", style: "afro", bpm: 104, root: 43, minor: true, seed: 5 },
  { name: "ambient-d", style: "ambient", bpm: 70, root: 38, minor: false, seed: 6 },
  { name: "dnb-e", style: "dnb", bpm: 174, root: 40, minor: true, seed: 7 },
  { name: "indie-a", style: "indie", bpm: 116, root: 45, minor: false, seed: 8 },
  { name: "hiphop-bb", style: "hiphop", bpm: 92, root: 34, minor: true, seed: 9 },
  { name: "amapiano-f", style: "amapiano", bpm: 113, root: 41, minor: true, seed: 10 },
  { name: "garage-g", style: "garage", bpm: 134, root: 43, minor: true, seed: 11 },
  { name: "house-am", style: "house", bpm: 122, root: 45, minor: true, seed: 12 },
];

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
function rng(seed: number) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

function render(l: (typeof LOOPS)[number]) {
  const n = SR * DUR;
  const out = new Float32Array(n);
  const beat = 60 / l.bpm;
  const r = rng(l.seed);
  const third = l.minor ? 3 : 4;
  const progression = l.minor ? [0, 8, 3, 10] : [0, 9, 5, 7];
  const add = (start: number, len: number, fn: (t: number, i: number) => number) => {
    const s0 = Math.floor(start * SR), s1 = Math.min(n, s0 + Math.floor(len * SR));
    for (let i = s0; i < s1; i++) out[i] += fn((i - s0) / SR, i);
  };
  const kick = (t0: number, g = 0.9) => add(t0, 0.35, (t) => g * Math.sin(2 * Math.PI * (50 * t + 90 * (1 - Math.exp(-t * 30)) / 30)) * Math.exp(-t * 9));
  const hat = (t0: number, g = 0.12, d = 40) => add(t0, 0.08, (t) => g * (r() * 2 - 1) * Math.exp(-t * d));
  const snare = (t0: number, g = 0.3) => add(t0, 0.2, (t) => g * ((r() * 2 - 1) * 0.7 + 0.3 * Math.sin(2 * Math.PI * 190 * t)) * Math.exp(-t * 18));
  const tone = (t0: number, len: number, midi: number, g: number, bright = 0.3, attack = 0.01) => {
    const f = mtof(midi);
    add(t0, len, (t) => {
      const env = Math.min(1, t / attack) * Math.exp(-t * (1.2 / len));
      const ph = 2 * Math.PI * f * t;
      return g * env * (Math.sin(ph) + bright * Math.sin(2 * ph) * 0.5 + bright * Math.sin(3 * ph) * 0.25);
    });
  };
  const chord = (t0: number, len: number, root: number, g: number, bright = 0.2, attack = 0.02) => {
    for (const iv of [0, third, 7, l.minor ? 10 : 11]) tone(t0, len, root + 24 + iv, g, bright, attack);
  };

  const bars = Math.ceil(DUR / (beat * 4));
  for (let b = 0; b < bars; b++) {
    const bt = b * beat * 4;
    const root = l.root + progression[b % 4];
    switch (l.style) {
      case "garage":
        for (const s of [0, 1.75, 2.5]) kick(bt + s * beat, 0.8);
        for (const s of [1, 3]) snare(bt + s * beat, 0.25);
        for (let i = 0; i < 8; i++) hat(bt + (i * 0.5 + (i % 2 ? 0.08 : 0)) * beat);
        for (const s of [0.5, 2.25]) chord(bt + s * beat, beat * 0.7, root, 0.05, 0.3);
        tone(bt, beat * 1.5, root, 0.22, 0.1); tone(bt + 2.75 * beat, beat, root + 7, 0.18, 0.1);
        break;
      case "house":
        for (let i = 0; i < 4; i++) { kick(bt + i * beat); hat(bt + (i + 0.5) * beat, 0.15); }
        for (const s of [1, 3]) snare(bt + s * beat, 0.15);
        chord(bt + 0.5 * beat, beat * 0.4, root, 0.05, 0.4); chord(bt + 2.5 * beat, beat * 0.4, root, 0.05, 0.4);
        for (let i = 0; i < 4; i++) tone(bt + (i + 0.5) * beat, beat * 0.4, root, 0.2, 0.2);
        break;
      case "techno":
        for (let i = 0; i < 4; i++) { kick(bt + i * beat, 1); hat(bt + (i + 0.5) * beat, 0.14, 25); }
        for (let i = 0; i < 16; i++) if (r() > 0.4) tone(bt + i * beat / 4, beat / 5, l.root + 12 + (r() > 0.7 ? 12 : 0), 0.08, 0.8);
        break;
      case "rnb":
        kick(bt); kick(bt + 2.25 * beat, 0.7); snare(bt + beat, 0.2); snare(bt + 3 * beat, 0.2);
        for (let i = 0; i < 8; i++) hat(bt + i * 0.5 * beat, 0.07);
        chord(bt, beat * 4, root, 0.045, 0.1, 0.15); tone(bt, beat * 3, root, 0.2, 0.05);
        break;
      case "afro":
        for (const s of [0, 1.5, 2, 3.5]) kick(bt + s * beat, 0.7);
        for (const s of [0.75, 1.75, 2.75, 3.75]) hat(bt + s * beat, 0.18, 30);
        for (const s of [1, 3]) snare(bt + s * beat, 0.14);
        for (const s of [0, 0.75, 1.5, 2.5, 3]) tone(bt + s * beat, beat * 0.3, root + 24 + (s * 4) % 7, 0.09, 0.5);
        tone(bt, beat * 2, root, 0.2, 0.1);
        break;
      case "ambient":
        chord(bt, beat * 4.5, root, 0.06, 0.05, 1.2);
        tone(bt + beat * 2, beat * 2, root + 31, 0.04, 0.0, 0.5);
        break;
      case "dnb":
        kick(bt); kick(bt + 2.5 * beat, 0.8); snare(bt + beat, 0.3); snare(bt + 3 * beat, 0.3);
        for (let i = 0; i < 8; i++) hat(bt + i * 0.5 * beat, 0.1);
        tone(bt, beat * 4, root - 12 + 12, 0.25, 0.05, 0.05); chord(bt, beat * 4, root, 0.03, 0.05, 0.8);
        break;
      case "indie":
        kick(bt); kick(bt + 2 * beat); snare(bt + beat, 0.25); snare(bt + 3 * beat, 0.25);
        for (let i = 0; i < 8; i++) hat(bt + i * 0.5 * beat, 0.08);
        for (let i = 0; i < 8; i++) chord(bt + i * 0.5 * beat, beat * 0.45, root, 0.025, 0.9, 0.005);
        tone(bt, beat * 2, root, 0.18, 0.2); tone(bt + 2 * beat, beat * 2, root + 7, 0.18, 0.2);
        break;
      case "hiphop":
        kick(bt); kick(bt + 0.75 * beat, 0.6); kick(bt + 2.5 * beat, 0.8); snare(bt + beat, 0.3); snare(bt + 3 * beat, 0.3);
        for (let i = 0; i < 8; i++) hat(bt + (i * 0.5 + (i % 2 ? 0.1 : 0)) * beat, 0.09);
        chord(bt, beat * 2, root, 0.04, 0.15, 0.03); chord(bt + 2 * beat, beat * 2, root + 5, 0.04, 0.15, 0.03);
        break;
      case "amapiano":
        for (let i = 0; i < 4; i++) { kick(bt + i * beat, 0.6); hat(bt + (i + 0.5) * beat, 0.1); }
        for (const s of [0.75, 2.25, 3.5]) tone(bt + s * beat, beat * 0.6, root - 12 + 24, 0.3, 0.05, 0.02); // log-drum-ish
        chord(bt, beat * 4, root, 0.035, 0.1, 0.4);
        break;
    }
  }
  // soft limiter + fades
  let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
  const gain = 0.85 / Math.max(peak, 1e-6);
  for (let i = 0; i < n; i++) {
    const fade = Math.min(1, i / (SR * 0.05), (n - i) / (SR * 0.6));
    out[i] = Math.tanh(out[i] * gain * 1.2) * fade * 0.9;
  }
  return out;
}

function wav(samples: Float32Array) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), 44 + i * 2));
  return buf;
}

mkdirSync("public/audio", { recursive: true });
for (const l of LOOPS) {
  const p = `public/audio/${l.name}`;
  writeFileSync(`${p}.wav`, wav(render(l)));
  try { execSync(`ffmpeg -loglevel error -y -i ${p}.wav -b:a 96k ${p}.mp3`); unlinkSync(`${p}.wav`); }
  catch { console.warn("ffmpeg not found — keeping WAV; seed expects .mp3, rename paths if needed"); }
}
console.log(`Wrote ${LOOPS.length} loops`);
