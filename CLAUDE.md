# CLAUDE.md — After Sales Dashboard

Project context for Claude Code. Read this before making changes.

## What this is
A Next.js dashboard for the UBOARD / TYGATEC after-sales (complaints) operation. It reads
complaint data **live** from two Google Sheets, merges them, and visualizes open/closed
complaints, an accountability board, issue analysis, team performance, and open-ticket tables.
**The app is READ-ONLY against the source sheets — never write to them.**

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Recharts (charts), papaparse (CSV parsing), lucide-react (icons)
- Hosted on Vercel; auto-deploys on every push to `master`.

## Run / build
```
npm install
npm run dev      # http://localhost:3000  (needs .env.local — see below)
npm run build    # production build check
git push         # auto-deploys to Vercel production
```

## Auth
- Login is gated by `src/middleware.ts` (cookie `auth_token` must equal `AUTH_SECRET`).
- Env vars (in `.env.local` locally, and Vercel → Settings → Env Vars in prod):
  `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `AUTH_SECRET`.
- Login UI: `src/app/login/page.tsx`; routes: `src/app/api/auth/{login,logout}/route.ts`.

## Data sources (TWO sheets, merged live, 5-min cache)
Configured in the `SHEETS` array in **`src/app/api/data/route.ts`**:
- **FY 2025-26** — Sheet `1p_PMOK2xpT7aKMhUCFmz9Yv195amaqY34IKz82JNktc`, tab "Form responses 1".
  Dates **DD/MM/YYYY**. Has `Days Pending` + `Ageing Days` columns.
- **FY 2026-27** (live, current) — Sheet `1sWaG-NnJ0eGltaeBTqXgCY9Ox6Dg661jSxLEEieNGhU`,
  tab "Helpdesk FY 26-27". Dates **M/D/YYYY**. NO `Days Pending`/`Ageing` (computed in app).
- Both shared "Anyone with link → Viewer". To add a future year, add another `SHEETS` entry.

## Data quirks (important)
- **Date formats differ per sheet** — handled by `parseDate(s, order)` with `dateOrder`
  'DMY'|'MDY'. All display dates normalized to DD/MM/YYYY via `toDMY()`.
- **Column drift:** FY26-27 uses `Complaint No` (not `Sequence No`) and `Request By`
  (capital B). Seq column is per-sheet config; request-by matched by regex `/^Request\s*by$/i`.
- `Customer Name` header has a trailing newline in both sheets — matched with a fuzzy key lookup.
- Brand normalization: `tyagtec`→`TYGATEC`. Platform normalization: `delar`→`Dealer`, etc.
- Open vs closed: `Action Taken === "Close Ticket"` → closed; everything else → open.
- Each row gets `fiscalYear` + a unique `id = "<fiscalYear>::<seq>"` (seq numbers repeat
  across years, so **use `id` for React keys**, not `sequenceNo`).
- `daysPending` / `ageingDays` / `daysInFactory` computed server-side when missing.
- Fetch uses `Promise.allSettled` — one sheet failing still renders the other.

## Accountability model (Accountability Board)
Each OPEN unit is bucketed by who owns the next move (see `src/lib/buckets.ts`):
- **Pending Pickup** → Altab (logistics: not yet in factory)
- **Pending Repair** → Adil (in factory, awaiting repair)
- **Pending Dispatch** → Altab (repaired, not shipped)
- **Pending Customer** → Prachi (payment / reply / closure blocked)
Buckets are auto-derived from the status column via `deriveBucket()`. A future companion
"Tracking" sheet will allow manual overrides + an Assign button (see HANDOVER.md §9).

## File map
- `src/app/api/data/route.ts` — ★ fetch + merge both sheets, normalize, compute fields.
- `src/components/Dashboard.tsx` — ★ main page: filters (Year/Brand/Type/Month), KPIs, layout.
- `src/components/*` — presentational components (HeroStats, AccountabilityBoard,
  OpenIssueBreakdown, OpenTicketsTable, RequestByTable, charts, KPICard).
- `src/lib/types.ts` — `ComplaintRow`, `Bucket`, `TrackingRecord`, `BUCKET_OWNER`.
- `src/lib/buckets.ts` — bucket derivation + date/day-count helpers + `enrich()`.

## Conventions
- Keep the source sheets untouched (read-only).
- After changes: `npm run build` must pass before pushing.
- Commit messages: short imperative summary + why.
- Windows/OneDrive: if a build fails with `readlink EINVAL` on `.next`, delete `.next` and retry.
