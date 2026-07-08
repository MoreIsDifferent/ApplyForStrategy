# Reliable Content — Verified Publications & Real Coauthors (Sub-project A)

**Date:** 2026-07-07
**Project:** Strategy PhD Faculty Finder (`web/` + `scraper/`)

## Background

A data audit of the live site found:

- 100 schools, but **21 have zero faculty**; **2,348 faculty** total.
- Faculty carry `openalex_match_confidence` with exactly two values:
  - **`name_institution`** (1,124) — name *and* institution matched; these have
    publications in the `publications` table (29,535 rows total).
  - **`ambiguous`** (1,224) — name matched but institution unconfirmed; the
    pipeline deliberately left these unmatched, so they have **no publications**
    and are flagged `needs_review`.
- **Topics / theories / methodology are bio-derived** (LLM-categorized from the
  scraped bio), independent of OpenAlex.
- **The `publications` table is never loaded by the frontend** — collected but
  invisible.
- **"Frequent Collaborators" is fabricated**: `getSampleCoauthors` picks faculty
  with *similar* topics/theories/school and labels them collaborators. This
  presents invented relationships as fact.

This sub-project is the first of three toward site-wide reliability. The other
two (matching backfill for the 1,224 ambiguous; faculty coverage for empty/thin
schools) are separate specs.

## Goal

Make shown content trustworthy and turn the hidden publication data into visible,
verified content:

1. Surface **real publications** for faculty whose match is verified.
2. Replace the fabricated collaborators with **real coauthors** from publication
   data.
3. Establish an **evidence-based reliability measure** (calibration) and the
   **affordances for a human to verify any record** in seconds.

Templates are data-driven: as later sub-projects verify more faculty, their
publications and coauthors appear automatically with no code change.

## Key decisions (locked with user)

- **Verified** ≡ `openalex_match_confidence === 'name_institution'`.
- **Hide scope for unverified faculty:** hide only OpenAlex-derived data
  (publications, coauthors). Keep bio-derived topics/theories — they still appear
  in topic search.
- **Trust model:** trust the `name_institution` tier *after* calibration confirms
  its accuracy. No per-record human approval required to display (but the site
  must make human spot-checking easy).
- **Calibration method:** automated cross-check against OpenAlex metadata.
- **Collaborators fix:** real "Frequent Coauthors" from `publications.coauthors`;
  the fabricated similarity graph is removed.

## Components

### 1. Calibration script — `scraper/scraper/audit_match_quality.py` (new)

A one-off, re-runnable measurement (not part of the app).

- Sample `name_institution` faculty (default ~100; `--all` to score everyone).
- For each, fetch the OpenAlex author (`/authors/A…`) and read
  `last_known_institutions` (+ affiliations) and top `x_concepts`/topics.
- Mark a match **suspect** when **both** are false:
  - the faculty's school name (or country) appears in the author's affiliations, and
  - the author's top field is business / management / economics / strategy-adjacent.
- Output:
  - a **reliability score**: `passed / sampled` as a percentage, and
  - a **suspect list**: `faculty name · school · openalex_author_id · reason`,
    written to `scraper/output/match_quality_suspects.csv` and printed.
- **Decision rule (documented, human-run):** if suspect rate ≤ ~5%, proceed to
  display `name_institution` publications as verified. If higher, tighten matching
  (sub-project B) before relying on it.

This is how reliability is *measured*; the suspect list is what a human reviews.

### 2. Data layer — the single trust boundary

**`web/lib/types.ts`:**
- New `Publication` type: `{ title: string; journal: string | null; year: number | null; citation_count: number }`.
- `Faculty` gains: `verified: boolean`, `publications: Publication[]`,
  `coauthors: { name: string; count: number }[]`, `openalexAuthorId: string | null`.

**`web/lib/data.ts` (`getAllFaculty`):**
- `verified = row.openalex_match_confidence === 'name_institution'`.
- Load the `publications` table (title, journal, year, citation_count, coauthors)
  by `faculty_id` **only for verified faculty**; sort by `citation_count desc`;
  cap the attached list at 25.
- Unverified faculty get `publications: []`, `coauthors: []`, `openalexAuthorId:
  null` unconditionally (belt-and-suspenders — the trust gate lives here, so no
  UI component can leak unverified OpenAlex data).
- `coauthors` derived via a pure helper (below).

**`web/lib/coauthors.ts`:**
- Remove `getSampleCoauthors` (the fabricated similarity function).
- Add pure `getTopCoauthors(publications: Publication[], limit = 8)` → counts name
  occurrences across the publications' `coauthors` arrays, returns top `limit`
  sorted by count desc then name asc.

### 3. UI

**`web/app/faculty/[id]/page.tsx`:**
- **Selected Publications** section — verified faculty only, rendered when
  `publications.length > 0`. Each row: title · *journal* · year · citation count,
  in the given (citation-desc) order. Small caption: "Publications matched via
  OpenAlex."
- **Frequent Coauthors** — verified faculty only, rendered when
  `coauthors.length > 0`. Names with counts as pills/list. Replaces the fake graph.
- **Verification affordance** — when `openalexAuthorId` is present, a link
  "View OpenAlex profile" → `https://openalex.org/<openalexAuthorId>` next to the
  existing Google Scholar / School Profile links, so any record is spot-checkable.
- Unverified faculty: no publications, no coauthors — the page remains the
  bio-only profile it effectively is today. No misleading data.

**Remove the fabricated graph everywhere:** delete `getSampleCoauthors` usage and
the `CoauthorGraph` component (+ its test) wherever they appear (faculty page, and
the school page if it uses them). `PortfolioChart` (school-page topic
distribution) is bio-derived and **stays unchanged**.

## Testing

- `getTopCoauthors`: aggregation/order, empty input (pure unit test).
- Data layer: verified faculty → publications + coauthors populated;
  unverified → both empty and `openalexAuthorId` null (mock Supabase, as existing
  data tests do).
- Faculty page render: verified shows Publications + Coauthors + OpenAlex link;
  unverified shows none of them.
- Calibration script: unit-test the suspect predicate (school/field match logic)
  with fixture author payloads; the live OpenAlex fetch is verified by running.

## Scope / non-goals

- No re-matching of the 1,224 ambiguous faculty (sub-project B).
- No scraping of empty/thin schools (sub-project C).
- No schema changes; no storing of matched-author institution on the faculty row
  (the OpenAlex link covers human verification). A persisted human-`reviewed`
  flag is explicitly deferred.
- Publication cap (`DEFAULT_LIMIT`/`EXPANDED_LIMIT` in enrichment) is unchanged.

## Tech stack

Next.js 16 / React 19 / TypeScript, Vitest (web); Python 3 + `requests`
(calibration); Supabase.
