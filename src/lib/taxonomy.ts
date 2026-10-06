// Single source of truth for fixed vocabularies. Seeded into the DB where they are relational.

export const ROLES = [
  { slug: "dj", name: "DJ" },
  { slug: "producer", name: "Producer" },
  { slug: "vocalist", name: "Singer / Vocalist" },
  { slug: "songwriter", name: "Songwriter" },
  { slug: "instrumentalist", name: "Instrumentalist" },
  { slug: "mix-engineer", name: "Mix Engineer" },
  { slug: "mastering-engineer", name: "Mastering Engineer" },
  { slug: "live-performer", name: "Live Performer" },
] as const;
export type RoleSlug = (typeof ROLES)[number]["slug"];

export const GENRES = [
  { slug: "uk-garage", name: "UK Garage" },
  { slug: "house", name: "House" },
  { slug: "techno", name: "Techno" },
  { slug: "alt-rnb", name: "Alt R&B" },
  { slug: "soul", name: "Soul" },
  { slug: "afrobeats", name: "Afrobeats" },
  { slug: "amapiano", name: "Amapiano" },
  { slug: "drum-and-bass", name: "Drum & Bass" },
  { slug: "indie", name: "Indie" },
  { slug: "bedroom-pop", name: "Bedroom Pop" },
  { slug: "hip-hop", name: "Hip-Hop" },
  { slug: "jazz", name: "Jazz" },
  { slug: "ambient", name: "Ambient" },
  { slug: "pop", name: "Pop" },
] as const;

export const SKILLS: { category: string; names: string[] }[] = [
  { category: "Production", names: ["Ableton Live", "Logic Pro", "FL Studio", "Beatmaking", "Arrangement", "Vocal Production", "Sound Design", "Sampling"] },
  { category: "Vocals", names: ["Soprano", "Alto", "Tenor", "Baritone", "Harmony", "Toplining", "Ad-libs", "Rap"] },
  { category: "Writing", names: ["Lyrics", "Melody", "Co-writing", "Hooks"] },
  { category: "DJ", names: ["Club Sets", "Open Format", "Radio Mixes", "Vinyl", "B2B"] },
  { category: "Instruments", names: ["Keys", "Guitar", "Bass", "Drums", "Strings", "Brass", "Synths"] },
  { category: "Engineering", names: ["Mixing", "Mastering", "Recording", "Dolby Atmos", "Stem Mastering", "Vocal Tuning"] },
];

export const LOOKING_FOR = [
  { slug: "collaborations", name: "Collaborations" },
  { slug: "paid-work", name: "Paid work" },
  { slug: "session-work", name: "Session work" },
  { slug: "gigs", name: "Gigs" },
  { slug: "remixes", name: "Remixes" },
  { slug: "songwriting", name: "Songwriting" },
  { slug: "networking", name: "Networking" },
  { slug: "producers", name: "Producers" },
  { slug: "vocalists", name: "Vocalists" },
  { slug: "musicians", name: "Musicians" },
  { slug: "engineers", name: "Engineers" },
] as const;

/** "Looking for producers" ↔ someone holding the producer role, etc. */
export const SEEKING_ROLE_MAP: Record<string, RoleSlug[]> = {
  producers: ["producer"],
  vocalists: ["vocalist"],
  musicians: ["instrumentalist", "live-performer"],
  engineers: ["mix-engineer", "mastering-engineer"],
  songwriting: ["songwriter"],
  remixes: ["producer", "dj"],
};

export const OPPORTUNITY_CATEGORIES = [
  { slug: "vocalist", name: "Vocalist wanted", role: "vocalist" },
  { slug: "producer", name: "Producer wanted", role: "producer" },
  { slug: "remix", name: "Remix request", role: "producer" },
  { slug: "songwriter", name: "Songwriter wanted", role: "songwriter" },
  { slug: "session_musician", name: "Session musician", role: "instrumentalist" },
  { slug: "dj_booking", name: "DJ booking", role: "dj" },
  { slug: "mix_engineer", name: "Mix engineer", role: "mix-engineer" },
  { slug: "mastering_engineer", name: "Mastering engineer", role: "mastering-engineer" },
  { slug: "live_performer", name: "Live performer", role: "live-performer" },
  { slug: "band_member", name: "Band member", role: "instrumentalist" },
] as const;
export type OpportunityCategory = (typeof OPPORTUNITY_CATEGORIES)[number]["slug"];
export const categoryName = (c: string) => OPPORTUNITY_CATEGORIES.find((x) => x.slug === c)?.name ?? c;
export const categoryRole = (c: string) => OPPORTUNITY_CATEGORIES.find((x) => x.slug === c)?.role;

export const CREDIT_ROLES = ["Produced", "Vocals", "Songwriting", "Mixed", "Mastered", "DJ Edit", "Remix", "Keys", "Guitar", "Bass", "Drums", "Strings", "Artwork", "Arrangement"];

export const PROJECT_STATUSES = [
  { slug: "idea", name: "Idea" },
  { slug: "recruiting", name: "Recruiting" },
  { slug: "in_progress", name: "In progress" },
  { slug: "mixing", name: "Mixing" },
  { slug: "finished", name: "Finished" },
  { slug: "released", name: "Released" },
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]["slug"];
export const statusName = (s: string) => PROJECT_STATUSES.find((x) => x.slug === s)?.name ?? s;

export const AVAILABILITY = [
  { slug: "available", name: "Available", hint: "Open to new projects" },
  { slug: "selective", name: "Selective", hint: "Only the right project" },
  { slug: "busy", name: "Busy", hint: "Not taking work right now" },
] as const;

export const KEYS = ["C major", "C minor", "C# major", "C# minor", "D major", "D minor", "Eb major", "Eb minor", "E major", "E minor", "F major", "F minor", "F# major", "F# minor", "G major", "G minor", "Ab major", "Ab minor", "A major", "A minor", "Bb major", "Bb minor", "B major", "B minor"];

/** Built-in city list so "nearby" works without a geocoding service. */
export const CITIES: { name: string; country: string; lat: number; lng: number }[] = [
  { name: "London", country: "UK", lat: 51.5072, lng: -0.1276 },
  { name: "Manchester", country: "UK", lat: 53.4808, lng: -2.2426 },
  { name: "Bristol", country: "UK", lat: 51.4545, lng: -2.5879 },
  { name: "Leeds", country: "UK", lat: 53.8008, lng: -1.5491 },
  { name: "Birmingham", country: "UK", lat: 52.4862, lng: -1.8904 },
  { name: "Glasgow", country: "UK", lat: 55.8642, lng: -4.2518 },
  { name: "Brighton", country: "UK", lat: 50.8225, lng: -0.1372 },
  { name: "Dublin", country: "Ireland", lat: 53.3498, lng: -6.2603 },
  { name: "Berlin", country: "Germany", lat: 52.52, lng: 13.405 },
  { name: "Amsterdam", country: "Netherlands", lat: 52.3676, lng: 4.9041 },
  { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  { name: "Lagos", country: "Nigeria", lat: 6.5244, lng: 3.3792 },
  { name: "Johannesburg", country: "South Africa", lat: -26.2041, lng: 28.0473 },
  { name: "New York", country: "USA", lat: 40.7128, lng: -74.006 },
  { name: "Los Angeles", country: "USA", lat: 34.0522, lng: -118.2437 },
  { name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832 },
];
export const cityByName = (n?: string | null) => CITIES.find((c) => c.name.toLowerCase() === (n ?? "").toLowerCase());
