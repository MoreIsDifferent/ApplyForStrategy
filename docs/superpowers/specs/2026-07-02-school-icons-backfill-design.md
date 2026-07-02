# School Icons Backfill — Design

**Date:** 2026-07-02
**Project:** Strategy PhD Faculty Finder (`web/`)

## Problem

The app shows a school logo next to each faculty entry and on school pages. The
display logic already exists with a 3-tier fallback:

1. `getSchoolIconUrl(slug)` — a hand-maintained override map in `web/lib/schoolIcons.ts`
2. `?? school.logo_url` — a column in the Supabase `schools` table
3. else → a colored box with the school's initials (`getInitials`)

Current state: there are **100 schools** in the DB. `logo_url` is populated for
**0** of them, and the override map covers only **3** (wharton, chicago-booth,
ucla-anderson). So **97 schools render as initials boxes** instead of real logos.

Every school row has a populated `website_url`, which makes automated logo
sourcing from each school's domain feasible.

## Goal

Every school shows a real logo instead of an initials box, sourced automatically
and committed to the repo. Schools the automation misses still degrade gracefully
to the existing initials fallback.

## Decisions (locked with user)

- **Sourcing:** fully automated (no manual per-school review).
- **Storage:** download logos into the repo under `web/public/school-icons/`
  (self-contained; no runtime dependency on an external service).
- **Source strategy:** site-native icons with a favicon fallback (option A below).

## Approach A — site-native icons + favicon fallback (chosen)

For each school domain (derived from `website_url`):

1. Fetch the site's HTML and extract the best available icon link — prefer
   `apple-touch-icon` (typically 180×180 PNG with real branding), then a
   declared high-resolution favicon.
2. If nothing suitable is found, fall back to
   `https://www.google.com/s2/favicons?domain=<domain>&sz=128`.

Rationale: gets the actual school branding where available, needs no API key,
and degrades predictably. A handful of schools will land on a smaller favicon;
that is acceptable for a fully-automated pass.

(Rejected: **B.** favicon-service-only — near-100% hit rate but capped at 128px
and often a generic favicon. **C.** Brandfetch/Clearbit — best-looking but now
requires an API key and has spotty coverage for business-school subdomains.)

## Components

### 1. Fetch script — `scraper/fetch_school_logos.py` (new)

- Read all 100 `{slug, website_url}` rows from Supabase (service role key from
  `web/.env.local`).
- Per school: derive domain, fetch HTML, extract best icon link, download it;
  fall back to the Google favicon service.
- Save as `web/public/school-icons/<slug>.<ext>`, skipping images that are
  broken or too small to be usable.
- **Skip** slugs already curated by hand (wharton, chicago-booth,
  ucla-anderson, unc-kenan-flagler) so they are never clobbered.
- Print a summary: real touch-icon vs. fallback favicon vs. failed, per school.

### 2. Wiring — `web/lib/schoolIcons.ts`

- Replace the hand-maintained 3-entry map with a generated `slug → filename`
  map covering all downloaded slugs (handles `.png/.svg/.ico/.jpg` extensions).
  The script regenerates this map (written to
  `web/lib/schoolIcons.generated.ts` and imported by `schoolIcons.ts`).
- Manually-curated entries remain as overrides that the script never overwrites:
  wharton, chicago-booth, ucla-anderson, plus **unc-kenan-flagler** (add from the
  existing `SchoolIcon/UNC_Kenan Flagler.png`).
- `getSchoolIconUrl(slug)` keeps its current signature. No changes required in
  `FacultyCard.tsx` or `app/schools/[slug]/page.tsx`. The existing 3-tier
  fallback still holds; any school the script misses degrades to initials.

### 3. Regeneration & idempotency

- Re-running the script re-fetches only missing/failed slugs by default;
  `--force` redoes all. Cheap to re-run as new schools are added.
- After a run, the generated map is rewritten automatically — nothing to
  hand-edit.

## Testing

- Unit test for `getSchoolIconUrl`: override precedence, generated-map hit, and
  null → initials fallback (extend existing `schoolIcons` test).
- The fetch script is I/O-heavy; verify by running it and inspecting the summary
  output plus spot-checking a few downloaded images, rather than mocking HTTP.

## Scope / non-goals

- No changes to how icons are *displayed* (size, border, initials styling stay).
- No DB writes — `schools.logo_url` stays unused; local files are the source of
  truth.
- No unrelated refactoring of the faculty/school data layer.
