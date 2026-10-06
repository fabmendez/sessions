// Seed content. Everyone's password is "session". Demo login: lewis@session.test

type C = {
  handle: string; name: string; roles: string[]; city: string; genres: string[];
  availability: "available" | "selective" | "busy"; remote: boolean; looking: string[]; skills: string[];
  bio: string; activeDaysAgo: number; joinedDaysAgo: number;
  samples: { title: string; role: string; genre: string; audio: string; with?: string[]; note?: string }[];
};

export const CREATORS: C[] = [
  {
    handle: "lewis", name: "Lewis Hart", roles: ["producer", "songwriter"], city: "London", genres: ["uk-garage", "alt-rnb", "house"],
    availability: "available", remote: true, looking: ["vocalists", "collaborations", "paid-work"],
    skills: ["Ableton Live", "Arrangement", "Vocal Production", "Sound Design", "Keys"],
    bio: "Garage-leaning producer from Peckham. I build tracks around a vocal, not the other way round — chopped harmonies, swung hats, sub you can feel on a phone speaker.",
    activeDaysAgo: 0, joinedDaysAgo: 420,
    samples: [
      { title: "Midnight Signals", role: "Produced", genre: "alt-rnb", audio: "garage-fsharp", with: ["maya", "jon", "nia"] },
      { title: "Northern Line Dub", role: "Produced", genre: "uk-garage", audio: "garage-g", with: ["maya", "nia", "jon"] },
      { title: "Soft Focus (sketch)", role: "Produced", genre: "house", audio: "house-am" },
    ],
  },
  {
    handle: "maya", name: "Maya Okafor", roles: ["vocalist", "songwriter"], city: "London", genres: ["alt-rnb", "soul", "uk-garage"],
    availability: "selective", remote: true, looking: ["producers", "songwriting", "paid-work"],
    skills: ["Alto", "Harmony", "Toplining", "Lyrics", "Melody"],
    bio: "Alto with a lot of air in it. I write toplines fast and stack my own harmonies. Happiest on late-night R&B and anything with a two-step under it.",
    activeDaysAgo: 1, joinedDaysAgo: 390,
    samples: [
      { title: "Midnight Signals", role: "Vocals", genre: "alt-rnb", audio: "garage-fsharp", with: ["lewis", "jon"] },
      { title: "Velvet Static", role: "Songwriting", genre: "soul", audio: "rnb-eb", note: "Co-written with Dami K." },
      { title: "Northern Line Dub", role: "Vocals", genre: "uk-garage", audio: "garage-g", with: ["lewis"] },
    ],
  },
  {
    handle: "jon", name: "Jon Reyes", roles: ["mix-engineer", "mastering-engineer"], city: "Manchester", genres: ["house", "uk-garage", "alt-rnb", "hip-hop"],
    availability: "available", remote: true, looking: ["paid-work", "collaborations"],
    skills: ["Mixing", "Mastering", "Stem Mastering", "Dolby Atmos", "Vocal Tuning"],
    bio: "Mix engineer at a small room in Ancoats. Vocals forward, low end tidy, nothing over-compressed. I send a first pass within five days and include two rounds of notes.",
    activeDaysAgo: 0, joinedDaysAgo: 510,
    samples: [
      { title: "Midnight Signals", role: "Mixed", genre: "alt-rnb", audio: "garage-fsharp", with: ["lewis", "maya"] },
      { title: "Low Tide", role: "Mixed", genre: "afrobeats", audio: "afro-g", with: ["ade", "amara"] },
      { title: "Glass House", role: "Mixed", genre: "drum-and-bass", audio: "dnb-e", with: ["dex", "kai"] },
    ],
  },
  {
    handle: "nia", name: "Nia Bello", roles: ["dj", "producer"], city: "London", genres: ["uk-garage", "house", "amapiano"],
    availability: "available", remote: false, looking: ["gigs", "remixes", "collaborations"],
    skills: ["Club Sets", "Vinyl", "Radio Mixes", "FL Studio", "B2B"],
    bio: "Resident at a Dalston basement, monthly show on community radio. I edit tracks for my own sets and design sleeves for friends' releases.",
    activeDaysAgo: 2, joinedDaysAgo: 300,
    samples: [
      { title: "Northern Line Dub (Nia's Edit)", role: "DJ Edit", genre: "uk-garage", audio: "garage-g", with: ["lewis"] },
      { title: "Basement Hours mix 014", role: "DJ Edit", genre: "house", audio: "house-c" },
    ],
  },
  {
    handle: "tomas", name: "Tomás Ferreira", roles: ["dj", "producer", "live-performer"], city: "Berlin", genres: ["techno", "ambient"],
    availability: "busy", remote: true, looking: ["gigs", "remixes"],
    skills: ["Ableton Live", "Sound Design", "Synths", "Club Sets"],
    bio: "Hypnotic, slow-building techno played live from a modular rig. Booked through December, still reading remix requests.",
    activeDaysAgo: 5, joinedDaysAgo: 640,
    samples: [
      { title: "Concrete Bloom", role: "Produced", genre: "techno", audio: "techno-a" },
      { title: "Spree at 6am", role: "Produced", genre: "ambient", audio: "ambient-d" },
    ],
  },
  {
    handle: "ade", name: "Adeola Adeyemi", roles: ["producer"], city: "Lagos", genres: ["afrobeats", "amapiano", "alt-rnb"],
    availability: "available", remote: true, looking: ["vocalists", "collaborations", "paid-work"],
    skills: ["FL Studio", "Beatmaking", "Arrangement", "Sampling"],
    bio: "Producer out of Yaba. Log drums, live percussion, warm keys. Looking for voices in London and Lagos for a run of singles next year.",
    activeDaysAgo: 0, joinedDaysAgo: 280,
    samples: [
      { title: "Low Tide", role: "Produced", genre: "afrobeats", audio: "afro-g", with: ["amara", "jon"] },
      { title: "Kasi Nights", role: "Produced", genre: "amapiano", audio: "amapiano-f", with: ["thandi"] },
    ],
  },
  {
    handle: "kezia", name: "Kezia Moss", roles: ["vocalist", "songwriter"], city: "Manchester", genres: ["indie", "bedroom-pop", "soul"],
    availability: "available", remote: false, looking: ["musicians", "producers", "gigs"],
    skills: ["Soprano", "Lyrics", "Melody", "Guitar"],
    bio: "Songs about bus stops and small kitchens. Putting a proper band together for spring — need a drummer who listens.",
    activeDaysAgo: 1, joinedDaysAgo: 200,
    samples: [
      { title: "Paper Moons", role: "Vocals", genre: "bedroom-pop", audio: "indie-a", with: ["ollie", "june"] },
      { title: "Graft (demo)", role: "Songwriting", genre: "indie", audio: "indie-a", with: ["finn"] },
    ],
  },
  {
    handle: "finn", name: "Finn Gallagher", roles: ["instrumentalist", "live-performer"], city: "Manchester", genres: ["indie", "jazz"],
    availability: "available", remote: false, looking: ["gigs", "session-work", "musicians"],
    skills: ["Guitar", "Bass", "Recording"],
    bio: "Guitar and bass, mostly live. Played the Night & Day circuit for six years. I can read charts and I'm good in a room.",
    activeDaysAgo: 3, joinedDaysAgo: 150,
    samples: [{ title: "Graft (demo)", role: "Guitar", genre: "indie", audio: "indie-a", with: ["kezia"] }],
  },
  {
    handle: "priya", name: "Priya Shah", roles: ["songwriter", "vocalist"], city: "London", genres: ["pop", "alt-rnb", "bedroom-pop"],
    availability: "selective", remote: true, looking: ["songwriting", "producers", "collaborations"],
    skills: ["Lyrics", "Hooks", "Co-writing", "Toplining", "Alto"],
    bio: "Topliner and co-writer. I've written for other artists for three years and I'm finally finishing my own record.",
    activeDaysAgo: 1, joinedDaysAgo: 360,
    samples: [
      { title: "Tender Machines", role: "Songwriting", genre: "pop", audio: "rnb-eb", with: ["lewis", "jon"] },
      { title: "Ghost Notes", role: "Vocals", genre: "bedroom-pop", audio: "indie-a" },
    ],
  },
  {
    handle: "dex", name: "Dexter Alleyne", roles: ["dj", "producer"], city: "Bristol", genres: ["drum-and-bass", "uk-garage"],
    availability: "available", remote: false, looking: ["gigs", "remixes", "networking"],
    skills: ["Club Sets", "Vinyl", "B2B", "Ableton Live"],
    bio: "Runs Pressure Drop, a monthly in Stokes Croft. Rollers, liquid, a bit of 2-step to finish. Always booking local support.",
    activeDaysAgo: 2, joinedDaysAgo: 470,
    samples: [
      { title: "Glass House", role: "Produced", genre: "drum-and-bass", audio: "dnb-e", with: ["kai", "jon"] },
      { title: "Pressure Drop live set", role: "DJ Edit", genre: "drum-and-bass", audio: "dnb-e" },
    ],
  },
  {
    handle: "lena", name: "Lena Vogt", roles: ["mastering-engineer"], city: "Berlin", genres: ["techno", "house", "ambient"],
    availability: "available", remote: true, looking: ["paid-work"],
    skills: ["Mastering", "Stem Mastering", "Dolby Atmos"],
    bio: "Mastering for club and listening records. Analogue chain in Kreuzberg, 48-hour turnaround, vinyl pre-mastering on request.",
    activeDaysAgo: 4, joinedDaysAgo: 700,
    samples: [
      { title: "Low Tide", role: "Mastered", genre: "afrobeats", audio: "afro-g", with: ["ade"] },
      { title: "Concrete Bloom", role: "Mastered", genre: "techno", audio: "techno-a", with: ["tomas"] },
    ],
  },
  {
    handle: "sam", name: "Sam Okoro", roles: ["producer", "instrumentalist"], city: "London", genres: ["jazz", "soul", "hip-hop"],
    availability: "available", remote: true, looking: ["vocalists", "musicians", "collaborations"],
    skills: ["Keys", "Logic Pro", "Arrangement", "Sampling"],
    bio: "Keys player who started producing. Live-band hip-hop and soul. I record everything to tape first and chop it later.",
    activeDaysAgo: 0, joinedDaysAgo: 260,
    samples: [
      { title: "Saturday Gold (rough)", role: "Produced", genre: "soul", audio: "hiphop-bb", with: ["rosa", "kai"] },
      { title: "Bus 38", role: "Keys", genre: "jazz", audio: "rnb-eb" },
    ],
  },
  {
    handle: "thandi", name: "Thandiwe Nkosi", roles: ["producer", "dj"], city: "Johannesburg", genres: ["amapiano", "house", "afrobeats"],
    availability: "selective", remote: true, looking: ["remixes", "collaborations", "gigs"],
    skills: ["FL Studio", "Beatmaking", "Club Sets", "Sound Design"],
    bio: "Amapiano with deep house bones. Two singles on a Joburg label this year. Open to remixes from people who'll flip it, not polish it.",
    activeDaysAgo: 1, joinedDaysAgo: 230,
    samples: [{ title: "Kasi Nights", role: "Produced", genre: "amapiano", audio: "amapiano-f", with: ["ade"] }],
  },
  {
    handle: "ollie", name: "Ollie Brennan", roles: ["producer", "songwriter"], city: "Dublin", genres: ["bedroom-pop", "indie", "pop"],
    availability: "available", remote: true, looking: ["vocalists", "collaborations"],
    skills: ["Logic Pro", "Guitar", "Melody", "Synths"],
    bio: "Bedroom pop from an actual bedroom. Finished my first EP with people I met here — looking for the next voice.",
    activeDaysAgo: 0, joinedDaysAgo: 21,
    samples: [{ title: "Paper Moons", role: "Produced", genre: "bedroom-pop", audio: "indie-a", with: ["kezia", "june"] }],
  },
  {
    handle: "rosa", name: "Rosa Delgado", roles: ["instrumentalist"], city: "Leeds", genres: ["ambient", "jazz", "pop", "soul"],
    availability: "available", remote: true, looking: ["session-work", "paid-work"],
    skills: ["Strings", "Recording", "Arrangement"],
    bio: "Violinist and string arranger. I record layered parts from my home room and can write the arrangement if you only have a melody.",
    activeDaysAgo: 2, joinedDaysAgo: 14,
    samples: [
      { title: "Saturday Gold (strings)", role: "Strings", genre: "soul", audio: "ambient-d", with: ["sam"] },
      { title: "Concrete Bloom", role: "Strings", genre: "techno", audio: "techno-a", with: ["tomas"] },
    ],
  },
  {
    handle: "kai", name: "Kai Turner", roles: ["instrumentalist", "live-performer"], city: "Bristol", genres: ["drum-and-bass", "jazz", "indie"],
    availability: "available", remote: false, looking: ["gigs", "musicians", "session-work"],
    skills: ["Drums", "Recording"],
    bio: "Drummer. Jungle breaks on a real kit, jazz trio on Sundays. I'll travel for the right band.",
    activeDaysAgo: 1, joinedDaysAgo: 9,
    samples: [
      { title: "Glass House", role: "Drums", genre: "drum-and-bass", audio: "dnb-e", with: ["dex"] },
      { title: "Saturday Gold (drums)", role: "Drums", genre: "soul", audio: "hiphop-bb", with: ["sam"] },
    ],
  },
  {
    handle: "amara", name: "Amara Eze", roles: ["vocalist"], city: "London", genres: ["afrobeats", "soul", "alt-rnb"],
    availability: "available", remote: true, looking: ["producers", "collaborations", "paid-work"],
    skills: ["Soprano", "Harmony", "Ad-libs", "Toplining"],
    bio: "Soprano, gospel-trained. Sang the hook on Low Tide. I record at home on a decent chain and can turn a topline around in 48 hours.",
    activeDaysAgo: 0, joinedDaysAgo: 190,
    samples: [
      { title: "Low Tide", role: "Vocals", genre: "afrobeats", audio: "afro-g", with: ["ade", "jon"] },
      { title: "Halo Bus Stop", role: "Vocals", genre: "soul", audio: "rnb-eb" },
    ],
  },
  {
    handle: "june", name: "June Park", roles: ["mix-engineer"], city: "Glasgow", genres: ["indie", "bedroom-pop", "pop"],
    availability: "selective", remote: true, looking: ["paid-work", "collaborations"],
    skills: ["Mixing", "Recording", "Vocal Tuning"],
    bio: "Mixing guitar records and intimate pop. I like a bit of room on things. Taking two or three projects a month.",
    activeDaysAgo: 3, joinedDaysAgo: 330,
    samples: [{ title: "Paper Moons", role: "Mixed", genre: "bedroom-pop", audio: "indie-a", with: ["ollie", "kezia"] }],
  },
];

export const SCENES = [
  { slug: "london-uk-garage", name: "London UK Garage", kind: "city" as const, city: "London", genre: "uk-garage",
    description: "Two-step, speed garage, and everything with a swung hat. Producers, MCs, vocalists and DJs working in and around London.",
    members: ["lewis", "maya", "nia", "priya", "amara", "dex"] },
  { slug: "manchester-indie", name: "Manchester Indie", kind: "city" as const, city: "Manchester", genre: "indie",
    description: "Bands forming, bands breaking up, and the people who record them. Gigs, rehearsal rooms and session players around Manchester.",
    members: ["kezia", "finn", "jon"] },
  { slug: "berlin-techno", name: "Berlin Techno", kind: "city" as const, city: "Berlin", genre: "techno",
    description: "Live acts, DJs and engineers in the Berlin techno world. Warehouse support slots, remix swaps and studio shares.",
    members: ["tomas", "lena"] },
  { slug: "afrobeats-producers", name: "Afrobeats Producers", kind: "genre" as const, city: null, genre: "afrobeats",
    description: "Producers and vocalists working in afrobeats, amapiano and alté, from Lagos to Joburg to London.",
    members: ["ade", "thandi", "amara"] },
  { slug: "bedroom-pop", name: "Bedroom Pop", kind: "genre" as const, city: null, genre: "bedroom-pop",
    description: "Home-recorded pop and the people who finish it. Swap stems, find a voice, get a mix.",
    members: ["ollie", "kezia", "priya", "june"] },
  { slug: "women-in-electronic-music", name: "Women in Electronic Music", kind: "community" as const, city: null, genre: null,
    description: "A space for women and non-binary producers, DJs and engineers to find collaborators and share opportunities.",
    members: ["nia", "lena", "thandi", "maya", "june"] },
];

type P = {
  slug: string; title: string; owner: string; genre: string; status: "idea" | "recruiting" | "in_progress" | "mixing" | "finished" | "released";
  progress: number; demo: string; scene?: string; description: string; daysAgo: number;
  members: { who: string; role: string; status?: "invited" | "active" }[];
  credits?: "confirmed" | "partial"; // issue credits; partial = some unconfirmed
  unconfirmed?: string[];
  activity: { who: string; kind: string; body: string; daysAgo: number }[];
  followers?: string[];
};

export const PROJECTS: P[] = [
  {
    slug: "midnight-signals", title: "Midnight Signals", owner: "lewis", genre: "alt-rnb", status: "released", progress: 100, demo: "garage-fsharp", scene: "london-uk-garage",
    description: "A slow-burning garage-R&B single about texting someone at 3am. Released on a small London label in spring.",
    daysAgo: 200,
    members: [{ who: "lewis", role: "Produced" }, { who: "maya", role: "Vocals" }, { who: "jon", role: "Mixed" }, { who: "nia", role: "Artwork" }],
    credits: "confirmed",
    activity: [
      { who: "lewis", kind: "status", body: "Moved to Released", daysAgo: 160 },
      { who: "jon", kind: "update", body: "Final mix bounced — vocals up 0.5dB per Maya's note", daysAgo: 175 },
    ],
    followers: ["priya", "amara", "dex"],
  },
  {
    slug: "northern-line-dub", title: "Northern Line Dub", owner: "lewis", genre: "uk-garage", status: "released", progress: 100, demo: "garage-g", scene: "london-uk-garage",
    description: "Dubbed-out two-step with chopped vocal stabs. Nia's club edit is the one that gets played out.",
    daysAgo: 380,
    members: [{ who: "lewis", role: "Produced" }, { who: "maya", role: "Vocals" }, { who: "nia", role: "DJ Edit" }, { who: "jon", role: "Mixed" }],
    credits: "confirmed",
    activity: [{ who: "nia", kind: "update", body: "Club edit added to the release", daysAgo: 330 }],
  },
  {
    slug: "low-tide", title: "Low Tide", owner: "ade", genre: "afrobeats", status: "released", progress: 100, demo: "afro-g", scene: "afrobeats-producers",
    description: "Afro-soul single built on a live shaker loop. Amara's hook was recorded in one take.",
    daysAgo: 150,
    members: [{ who: "ade", role: "Produced" }, { who: "amara", role: "Vocals" }, { who: "jon", role: "Mixed" }, { who: "lena", role: "Mastered" }],
    credits: "confirmed",
    activity: [{ who: "ade", kind: "status", body: "Moved to Released", daysAgo: 110 }],
    followers: ["thandi", "lewis"],
  },
  {
    slug: "glass-house", title: "Glass House", owner: "dex", genre: "drum-and-bass", status: "released", progress: 100, demo: "dnb-e",
    description: "Liquid roller with live drums tracked in a Bristol rehearsal room.",
    daysAgo: 120,
    members: [{ who: "dex", role: "Produced" }, { who: "kai", role: "Drums" }, { who: "jon", role: "Mixed" }],
    credits: "confirmed",
    activity: [{ who: "kai", kind: "update", body: "Drums tracked at Factory Studios", daysAgo: 100 }],
  },
  {
    slug: "paper-moons", title: "Paper Moons", owner: "ollie", genre: "bedroom-pop", status: "finished", progress: 100, demo: "indie-a", scene: "bedroom-pop",
    description: "Four-track bedroom pop EP. Finished last week, release date to come.",
    daysAgo: 18,
    members: [{ who: "ollie", role: "Produced" }, { who: "kezia", role: "Vocals" }, { who: "june", role: "Mixed" }],
    credits: "partial", unconfirmed: ["june"],
    activity: [
      { who: "ollie", kind: "credits", body: "Issued credits to 3 contributors", daysAgo: 4 },
      { who: "june", kind: "update", body: "Mixes delivered for all four tracks", daysAgo: 6 },
    ],
    followers: ["priya"],
  },
  {
    slug: "tender-machines", title: "Tender Machines", owner: "priya", genre: "pop", status: "finished", progress: 100, demo: "rnb-eb",
    description: "The lead single from Priya's own record. Glassy synths, a big chorus, a quiet bridge.",
    daysAgo: 60,
    members: [{ who: "priya", role: "Songwriting" }, { who: "lewis", role: "Produced" }, { who: "jon", role: "Mixed" }],
    credits: "partial", unconfirmed: ["lewis"],
    activity: [{ who: "priya", kind: "credits", body: "Issued credits to 3 contributors", daysAgo: 2 }],
  },
  {
    slug: "concrete-bloom", title: "Concrete Bloom", owner: "tomas", genre: "techno", status: "mixing", progress: 80, demo: "techno-a", scene: "berlin-techno",
    description: "Live-recorded techno with a string section folded in. Three tracks for a 12\".",
    daysAgo: 70,
    members: [{ who: "tomas", role: "Produced" }, { who: "lena", role: "Mastered" }, { who: "rosa", role: "Strings" }],
    activity: [
      { who: "rosa", kind: "update", body: "Uploaded the second string pass, more vibrato on the long notes", daysAgo: 3 },
      { who: "tomas", kind: "status", body: "Moved to Mixing", daysAgo: 8 },
    ],
    followers: ["lewis", "nia"],
  },
  {
    slug: "saturday-gold", title: "Saturday Gold", owner: "sam", genre: "soul", status: "in_progress", progress: 45, demo: "hiphop-bb",
    description: "Live-band soul with a hip-hop backbone. The band's tracked; it needs a voice that can carry the chorus.",
    daysAgo: 40,
    members: [{ who: "sam", role: "Produced" }, { who: "rosa", role: "Strings" }, { who: "kai", role: "Drums" }],
    activity: [
      { who: "kai", kind: "joined", body: "Joined as Drums", daysAgo: 7 },
      { who: "sam", kind: "update", body: "Rough mix of the full band is up", daysAgo: 2 },
    ],
    followers: ["lewis", "maya"],
  },
  {
    slug: "after-hours-choir", title: "After Hours Choir", owner: "lewis", genre: "alt-rnb", status: "recruiting", progress: 25, demo: "garage-fsharp", scene: "london-uk-garage",
    description: "Alt-R&B over a UK garage shuffle. The beat and the chords are done; it needs a lead vocal and a stack of harmonies.",
    daysAgo: 12,
    members: [{ who: "lewis", role: "Produced" }],
    activity: [{ who: "lewis", kind: "update", body: "Posted an open call for a vocalist", daysAgo: 6 }],
    followers: ["maya", "nia", "jon", "amara"],
  },
  {
    slug: "graft", title: "Graft", owner: "kezia", genre: "indie", status: "recruiting", progress: 20, demo: "indie-a", scene: "manchester-indie",
    description: "Kezia's new band. Six songs written, rehearsing in Ancoats from November. Need a drummer and someone to mix the first single.",
    daysAgo: 25,
    members: [{ who: "kezia", role: "Vocals" }, { who: "finn", role: "Guitar" }],
    activity: [{ who: "finn", kind: "joined", body: "Joined as Guitar", daysAgo: 15 }],
    followers: ["june", "kai"],
  },
  {
    slug: "kasi-nights", title: "Kasi Nights", owner: "thandi", genre: "amapiano", status: "in_progress", progress: 60, demo: "amapiano-f", scene: "afrobeats-producers",
    description: "Amapiano single with a remix package planned. Ade co-produced the drums from Lagos.",
    daysAgo: 35,
    members: [{ who: "thandi", role: "Produced" }, { who: "ade", role: "Produced" }, { who: "lewis", role: "Remix", status: "invited" }],
    activity: [{ who: "ade", kind: "update", body: "New log drum pattern on the second drop", daysAgo: 1 }],
    followers: ["lewis", "nia"],
  },
];

type O = {
  author: string; project?: string; category: string; title: string; projectSummary: string; lookingFor: string; style?: string;
  bpm?: number; key?: string; paid: boolean; budget?: number; currency?: string; deadlineInDays?: number; deadlineAt?: string; remote: boolean; city?: string;
  demo?: string; genres: string[]; scene?: string; daysAgo: number;
  applications?: { who: string; message: string; fee?: number; status?: "pending" | "shortlisted" | "accepted" | "declined" }[];
};

export const OPPORTUNITIES: O[] = [
  {
    author: "lewis", project: "after-hours-choir", category: "vocalist", title: "Need a vocalist for an alt-R&B / garage track",
    projectSummary: "Alt-R&B / UK Garage track", lookingFor: "Female/femme vocalist", style: "Soulful vocal — topline + recording",
    bpm: 132, key: "F# minor", paid: true, budget: 200, deadlineAt: "2026-10-18", remote: true, demo: "garage-fsharp",
    genres: ["alt-rnb", "uk-garage"], scene: "london-uk-garage", daysAgo: 6,
    applications: [
      { who: "amara", message: "Love the chords on this. I'd stack harmonies an octave up on the second chorus. Can deliver dry stems + a comped lead in 4 days.", fee: 200, status: "shortlisted" },
      { who: "priya", message: "I can write the topline and sing it. I've got a hook idea already from the first 8 bars — happy to send a voice note.", fee: 250 },
      { who: "kezia", message: "Bit outside my usual lane but I'd like to try something with more swing. No fee needed if I can keep a writing credit.", fee: 0 },
    ],
  },
  {
    author: "sam", project: "saturday-gold", category: "vocalist", title: "Soul singer for a live-band single",
    projectSummary: "Live-band soul / hip-hop single", lookingFor: "Lead vocalist with real range", style: "Classic soul delivery, chorus that lifts",
    bpm: 88, key: "Eb major", paid: true, budget: 150, deadlineInDays: 27, remote: true, demo: "hiphop-bb",
    genres: ["soul", "hip-hop", "jazz"], daysAgo: 3,
    applications: [{ who: "maya", message: "This is right in my lane. Free to record next week.", fee: 150 }],
  },
  {
    author: "kezia", project: "graft", category: "band_member", title: "Drummer for a new indie band",
    projectSummary: "New Manchester indie band, six songs written", lookingFor: "Drummer who can play quiet", style: "Big Thief, Wet Leg, early Arctic Monkeys",
    bpm: 116, key: "A major", paid: false, deadlineInDays: 40, remote: false, city: "Manchester", demo: "indie-a",
    genres: ["indie"], scene: "manchester-indie", daysAgo: 10,
    applications: [{ who: "kai", message: "Bristol-based but in Manchester twice a month. Happy to come up for a rehearsal.", status: "pending" }],
  },
  {
    author: "kezia", project: "graft", category: "mix_engineer", title: "Mix engineer for our first single",
    projectSummary: "Indie single, 9 tracked stems", lookingFor: "Mix engineer who likes room sound", style: "Live, warm, not too polished",
    paid: true, budget: 250, deadlineInDays: 21, remote: true, genres: ["indie"], daysAgo: 5,
    applications: [
      { who: "june", message: "This is exactly the kind of record I mix. Happy to do a test mix of 60 seconds before you commit.", fee: 240, status: "shortlisted" },
      { who: "jon", message: "Local to you, could sit in on a session in Ancoats. 2 rounds of notes included.", fee: 250 },
    ],
  },
  {
    author: "thandi", project: "kasi-nights", category: "remix", title: "Remix Kasi Nights",
    projectSummary: "Amapiano single, remix package", lookingFor: "Producers who'll flip it into another genre", style: "Garage, house or techno flips welcome",
    bpm: 113, key: "F minor", paid: false, deadlineInDays: 30, remote: true, demo: "amapiano-f",
    genres: ["amapiano", "house", "uk-garage"], scene: "afrobeats-producers", daysAgo: 4,
  },
  {
    author: "dex", category: "dj_booking", title: "Support DJ for Pressure Drop, 30 October",
    projectSummary: "Monthly D&B night, Stokes Croft", lookingFor: "Local DJ, 10–11pm warm-up slot", style: "Liquid and garage — set the room up",
    paid: true, budget: 120, deadlineInDays: 14, remote: false, city: "Bristol", genres: ["drum-and-bass", "uk-garage"], daysAgo: 2,
  },
  {
    author: "priya", category: "producer", title: "Producer for two pop songs",
    projectSummary: "Two songs for my debut record", lookingFor: "Producer comfortable with big pop choruses", style: "Glassy synths, R&B drums",
    paid: true, budget: 300, deadlineInDays: 45, remote: false, city: "London", genres: ["pop", "alt-rnb"], daysAgo: 8,
    applications: [{ who: "lewis", message: "Loved working on Tender Machines — happy to go again. Could do a session at mine in Peckham.", fee: 300 }],
  },
  {
    author: "ade", category: "vocalist", title: "Afrobeats vocalist for a single",
    projectSummary: "Mid-tempo afrobeats single", lookingFor: "Vocalist, English or Yoruba", style: "Smooth, conversational, catchy hook",
    bpm: 104, key: "G minor", paid: true, budget: 250, deadlineInDays: 20, remote: true, demo: "afro-g",
    genres: ["afrobeats", "alt-rnb"], scene: "afrobeats-producers", daysAgo: 1,
  },
  {
    author: "ollie", category: "mastering_engineer", title: "Master a 4-track EP",
    projectSummary: "Bedroom pop EP, 4 tracks, mixed", lookingFor: "Mastering engineer for streaming + vinyl", style: "Keep the dynamics",
    paid: true, budget: 160, deadlineInDays: 12, remote: true, genres: ["bedroom-pop", "indie"], scene: "bedroom-pop", daysAgo: 1,
  },
  {
    author: "finn", category: "session_musician", title: "Keys player for gigs",
    projectSummary: "Indie-jazz four-piece", lookingFor: "Keys / Rhodes player", style: "Comping, a few solos",
    paid: false, deadlineInDays: 35, remote: false, city: "Manchester", genres: ["indie", "jazz"], daysAgo: 9,
  },
  {
    author: "tomas", category: "live_performer", title: "Live act support slot, warehouse show",
    projectSummary: "Warehouse show in Friedrichshain", lookingFor: "Live hardware act, 60 minutes", style: "Hypnotic, slow-building",
    paid: true, budget: 300, currency: "EUR", deadlineInDays: 18, remote: false, city: "Berlin", genres: ["techno"], scene: "berlin-techno", daysAgo: 6,
  },
  {
    author: "nia", category: "songwriter", title: "Topline writer for a garage track",
    projectSummary: "Garage track for my first EP", lookingFor: "Songwriter for verse + hook", style: "Late-night, a bit bittersweet",
    bpm: 134, key: "G minor", paid: false, deadlineInDays: 25, remote: true, demo: "garage-g", genres: ["uk-garage"], scene: "london-uk-garage", daysAgo: 3,
  },
  {
    author: "amara", category: "producer", title: "Producer for an afro-soul single",
    projectSummary: "Afro-soul single, demo recorded", lookingFor: "Producer with live instrumentation", style: "Warm keys, live percussion",
    paid: true, budget: 400, deadlineInDays: 50, remote: true, genres: ["afrobeats", "soul"], daysAgo: 2,
  },
];

export const CONNECTIONS: [string, string, "accepted" | "pending"][] = [
  ["lewis", "maya", "accepted"], ["lewis", "jon", "accepted"], ["lewis", "nia", "accepted"], ["priya", "lewis", "accepted"],
  ["ade", "lewis", "pending"], ["sam", "lewis", "pending"], ["lewis", "thandi", "accepted"],
  ["ade", "amara", "accepted"], ["ade", "jon", "accepted"], ["ade", "thandi", "accepted"], ["lena", "ade", "accepted"],
  ["kezia", "finn", "accepted"], ["ollie", "kezia", "accepted"], ["ollie", "june", "accepted"],
  ["dex", "kai", "accepted"], ["dex", "jon", "accepted"], ["sam", "rosa", "accepted"], ["sam", "kai", "accepted"],
  ["tomas", "lena", "accepted"], ["tomas", "rosa", "accepted"], ["maya", "jon", "accepted"], ["nia", "dex", "accepted"],
];

export const CONVERSATIONS: { between: [string, string]; messages: { from: string; body?: string; kind?: "text" | "project_invite" | "opportunity_link" | "profile_link" | "project_link"; ref?: string; role?: string; hoursAgo: number }[] }[] = [
  {
    between: ["lewis", "maya"],
    messages: [
      { from: "lewis", body: "Started something new — garage shuffle, very After Hours. Would love you on it but I know you're busy.", hoursAgo: 150 },
      { from: "maya", body: "I'm on a deadline till the 20th sadly. Send it anyway, I want to hear it.", hoursAgo: 140 },
      { from: "lewis", kind: "project_link", ref: "after-hours-choir", hoursAgo: 139 },
      { from: "maya", body: "Ok that's annoyingly good. Have you looked at Amara? She'd kill this.", hoursAgo: 20 },
      { from: "maya", kind: "profile_link", ref: "amara", hoursAgo: 20 },
    ],
  },
  {
    between: ["lewis", "jon"],
    messages: [
      { from: "jon", body: "Tender Machines master's back from Lena's room. Sounds great on the car test.", hoursAgo: 60 },
      { from: "lewis", body: "Brilliant. Priya's issued credits — I'll confirm mine tonight.", hoursAgo: 58 },
      { from: "jon", body: "Also if you want me on After Hours Choir when it's tracked, just shout.", hoursAgo: 30 },
    ],
  },
  {
    between: ["thandi", "lewis"],
    messages: [
      { from: "thandi", body: "Heard Northern Line Dub on Nia's show. Would you do a garage flip of Kasi Nights for the remix package?", hoursAgo: 26 },
      { from: "thandi", kind: "project_invite", ref: "kasi-nights", role: "Remix", hoursAgo: 26 },
    ],
  },
  {
    between: ["amara", "lewis"],
    messages: [
      { from: "amara", body: "Just applied to your vocalist call. Maya pointed me your way!", hoursAgo: 18 },
      { from: "amara", kind: "opportunity_link", ref: "0", hoursAgo: 18 },
    ],
  },
];
