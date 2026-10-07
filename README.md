# Session

A network for music creators built around one question: **who is the right person for my next project?**

The core loop — Profile → Discover → Connect → Collaborate → Credit → Reputation → Better discovery — works end to end: a creator onboards, gets matched, applies to an open call, is accepted onto a project, gets credited when it's finished, confirms the credit, and that confirmed credit feeds their track record and future matching.

## Run it

Requires Node 20+. No database to install.

**Windows:** double-click `start.cmd`. It installs dependencies on the first run, starts everything and opens http://localhost:3000.

**Any OS:**

```bash
npm install
npm run local            # starts the built-in database + the app
```

`npm run local reset` wipes and re-seeds the demo data; `npm run local prod` runs a production build. Stop with Ctrl+C.

The built-in database is embedded PostgreSQL compiled to WebAssembly ([PGlite](https://pglite.dev)), stored in `./.pglite`, and served to the app on 127.0.0.1:5433 by `scripts/local.ts` — it works anywhere Node does, including Windows on ARM.

**On a VPS (from GitHub):** needs Docker with Compose v2.

```bash
git clone https://github.com/fabmendez/session.git /opt/session
cd /opt/session && bash deploy.sh
```

`deploy.sh` starts the app and its own PostgreSQL with Docker Compose, creates the database on first boot and adds the demo data, then prints the URL. Settings live in `/opt/session/.env` (created on first run: `APP_PORT`, `COOKIE_SECURE`, `SEED_DEMO`, random DB password); uploads are kept in a Docker volume. To update: `cd /opt/session && git pull && bash deploy.sh` — data is kept. For a domain via Traefik, see the commented labels in `docker-compose.yml`.

Without GitHub, `deploy.cmd` (Windows) packs the folder, uploads it over SSH and runs `deploy.sh` for you.

**With your own PostgreSQL server:** set `DATABASE_URL` in `.env`, then `npm run db:boot && npm run dev` (or `npm run build && npm start`).

**Demo login:** `lewis@session.test` / `session` (pre-filled on the login page). Every seeded creator uses the password `session` — log in as `amara@session.test`, `thandi@session.test` etc. to see the other side of an interaction.

## What's in the seed

18 creators across London, Manchester, Bristol, Berlin, Lagos, Joburg and more; 14 genres; 11 projects (released, finished, mixing, recruiting); 13 open calls; 6 scenes; confirmed credits forming real repeat-collaborator histories; connections, applications, project invites and message threads. Lewis (the demo user) lands on a Radar with an invite, a credit to confirm, applicants to review and connection requests.

Demo audio is synthesized locally (`scripts/gen-audio.ts`) and cover art is generated per project (`src/components/Artwork.tsx`), so nothing copyrighted ships with the app.

## Stack

Next.js 15 (App Router, server components, server actions) · React 19 · TypeScript · PostgreSQL + Drizzle ORM · Tailwind CSS v4 · Instrument Serif / Inter Tight / JetBrains Mono (self-hosted via Fontsource).

## Structure

```
src/db/schema.ts           relational schema (all tables, enums, indexes)
src/db/seed/               seed data + loader
drizzle/                   SQL migrations
src/lib/match.ts           explainable matching (creator↔creator, creator↔open call)
src/lib/profiles.ts        profile loading + collaboration stats from confirmed credits
src/lib/work.ts            projects, open calls, credits, activity loaders
src/lib/auth.ts            sessions (hashed tokens, httpOnly cookie)
src/lib/storage.ts         media storage interface (local disk adapter)
src/app/actions/           server actions — every mutation lives here
src/app/(app)/             signed-in routes: radar, discover, u/[handle], projects, opportunities, scenes, messages
```

## Key decisions

- **No follower counts, no ratings.** Trust comes from *confirmed* credits only: completed projects, unique collaborators, repeat collaborators. A credit counts once the person named confirms it, so stats can't be self-inflated.
- **Matching is explainable.** Every point in `match.ts` comes with a reason the UI shows ("you're looking for a vocalist · same genres · nearby · available"). Runs in TS over a SQL-filtered candidate set — fine to tens of thousands of creators; move it into SQL or a search index beyond that.
- **Open roles are open calls.** An opportunity with a `project_id` *is* the project's open position, so there's one apply/review flow. Accepting an applicant adds them to the project, moves it to In progress, and opens a message thread.
- **Finishing a project issues credits** from its members (owner can edit wording or leave someone off). The owner's credit is auto-confirmed; everyone else confirms from Radar, the project page, or their profile.
- **Private feedback is reserved, not built.** `collaborator_feedback` exists in the schema (author → subject, per project, never aggregated) so it can be added without migrations to existing data.
- **OAuth is reserved, not wired.** Email/password auth is live; the `accounts` table is ready for Google/Apple/Spotify providers.
- **Messaging polls** every 8 s while a thread is open. Swap for SSE/websockets when needed.
- **Scenes** are membership + filtered content (things posted into the scene, or matching its genre and city). Discussions and events are left out of the MVP.

## Not built (by design, per brief)

Livestreaming, distribution, royalty splits, payments, DAW integrations, fan accounts, ML recommendations, public review scores, event management. Nothing in the schema blocks them.

## Production notes

- Swap `localStorage` in `src/lib/storage.ts` for an S3/R2 adapter (one `put` function).
- Set `NODE_ENV=production` so session cookies are `Secure`.
- "Nearby" uses a built-in city list with coordinates (`src/lib/taxonomy.ts`); add a geocoder to support any city.
