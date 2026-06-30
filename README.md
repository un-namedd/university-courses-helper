# UoG Degree Planner

A drag-and-drop degree planner for **every** University of Guelph undergraduate
program (all majors and their Areas of Emphasis). It fixes the official planner's
"double-counting" problem by allocating each course to the most specific
requirement it satisfies, so your Major, Area of Emphasis, restricted electives,
and free electives all track independently.

- **All programs, scraped automatically** from the official calendar PDFs.
- **Smart allocation** — a greedy, most-specific-first engine assigns each placed
  course to exactly one requirement group (no double counting, nothing missing).
- **Plan visually** — drag courses between terms, add custom electives, see
  prerequisite and offering-season warnings.
- **Three layouts**, light/dark themes, and a full course-info dialog.
- **Optional cloud sync** (Supabase) — sign in with email magic link or Google,
  save plans to the cloud, and generate read-only share links.

## Tech stack

Vite + React + TypeScript, Zustand, Tailwind CSS, dnd-kit, React Router, and
Supabase (auth + Postgres). Catalog data is static JSON served from the CDN;
Supabase stores only user data.

## Getting started

```bash
npm install
npm run dev
```

The app works offline with localStorage-only plans. To enable cloud sync, copy
`.env.example` to `.env` and fill in your Supabase project URL and anon key.

## Data

Course and program data are generated from the UoG calendar PDFs and committed to
`public/` so the app loads them as static assets:

```bash
npm run scrape          # public/courses.json (every course)
npm run scrape:programs # public/programs/*.json + public/programs-index.json
npm run scrape:all      # both
```

The Computer Science program (and its co-op variant) is curated for guaranteed
accuracy; all other programs are parsed best-effort. Where a requirement rule
can't be parsed cleanly, free electives absorb the remainder so a program's total
always matches the calendar's published total credits.

## Cloud sync (Supabase)

1. Create a Supabase project.
2. Apply the migration in `supabase/migrations/0001_plans.sql` (via the SQL
   editor or the Supabase CLI). It creates the `plans` table with row-level
   security: owners manage their own plans, and anyone can read a plan that has
   been shared publicly.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. (Optional) Configure a Google OAuth provider in Supabase Auth for "Continue
   with Google"; email magic links work with no extra setup.

## Deploy (Vercel)

`vercel.json` adds the SPA rewrite so client routes (like `/p/:shareId`) resolve.
Set the two `VITE_SUPABASE_*` environment variables in the Vercel project, then
deploy. The build command is `npm run build` and the output directory is `dist`.

## License

MIT — see [LICENSE](LICENSE).
