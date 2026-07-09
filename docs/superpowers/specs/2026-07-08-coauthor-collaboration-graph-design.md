# Coauthor Collaboration Graph — Design

**Date:** 2026-07-08
**Project:** Strategy PhD Faculty Finder (`web/`)

## Background

The verified-publications work (sub-project A) added a **"Frequent Coauthors"
text list** to the faculty detail page, computed from `publications.coauthors`
(real coauthor name strings) for OpenAlex-verified faculty. A prior *fabricated*
"Frequent Collaborators" graph (similar-faculty heuristic) was removed.

A data check found **988 coauthor names exactly match a faculty name** in the DB
(26,044 of 117,887 coauthor mentions, ~22%). So a real ego collaboration graph —
with clickable links to coauthors who are themselves in the directory — is
feasible.

## Goal

Replace the "Frequent Coauthors" text list on the faculty page with a real **ego
collaboration graph**: the faculty at the center, their top coauthors around it,
where coauthors who are also faculty in the directory are clickable and navigate
to that coauthor's own faculty page.

## Decisions (locked with user)

- **Scope:** ego graph on the faculty detail page (not a global or per-school
  network). Only verified faculty have coauthors, so the graph only appears for
  them (unchanged gate).
- **Clickthrough:** in-network coauthors (name matches exactly one faculty) link
  to `/faculty/{id}`; external coauthors are non-clickable nodes.
- **Matching:** exact case-insensitive full-name match with a uniqueness guard —
  a name shared by 2+ faculty links to none (precision over recall; never a wrong
  link). No fuzzy matching.
- **Rendering:** hand-rolled radial SVG (server component, no new dependency,
  deterministic for static generation). No force-directed library.
- **The text list is replaced** by the graph (not kept alongside).

## Components

### 1. Data layer — resolve coauthor → faculty links

- **`web/lib/types.ts`:** extend `Coauthor` to
  `{ name: string; count: number; facultyId: string | null }`.
- **`web/lib/coauthors.ts`:** change `getTopCoauthors`'s return type from the
  current `Coauthor[]` to a plain `{ name: string; count: number }[]` (it no
  longer knows about `facultyId`). Add a pure helper
  `linkCoauthors(coauthors: {name: string; count: number}[], nameIndex: Map<string, string | null>): Coauthor[]`
  that, for each coauthor, looks up `name.toLowerCase()` in `nameIndex` and returns
  a `Coauthor` with `facultyId` = the mapped id, or `null` if absent or ambiguous
  (a name mapped to `null` in the index).
- **`web/lib/data.ts` (`getAllFaculty`):** after `rows.map(buildFaculty)`, build a
  `nameIndex: Map<string, string | null>` over ALL faculty: for each faculty,
  `name.toLowerCase()` → id; if a name is seen twice, set its value to `null`
  (ambiguous). Then map each faculty to attach links:
  `{ ...f, coauthors: linkCoauthors(f.coauthors, nameIndex) }`. Verified faculty
  gain `facultyId` on their coauthors; unverified keep `coauthors: []`.
  `buildFaculty` still sets `coauthors` (via `getTopCoauthors`) with
  `facultyId: null` initially — so `buildFaculty` must construct `Coauthor`
  objects; simplest is for `getTopCoauthors` to return `{name, count}` and
  `buildFaculty` to map them to `{name, count, facultyId: null}` before the
  linking pass overwrites `facultyId`.

Note: coauthors may link to unverified faculty (their page exists, bio-only) —
that is fine and intended.

### 2. Graph component — `web/components/CoauthorGraph.tsx` (new)

Server component (static SVG, no `'use client'`).

- **Props:** `{ centerName: string; coauthors: Coauthor[] }`.
- **Empty state:** returns `null` when `coauthors.length === 0`.
- **Layout via pure helper** `coauthorGraphLayout(coauthors)` in a new
  `web/lib/coauthorGraph.ts`, returning, for a fixed SVG viewBox, the
  center point and, per coauthor, `{ x, y, radius, strokeWidth, name, facultyId,
  count }`. Coauthors are placed evenly on a circle (angle = index / n · 2π);
  `radius` and `strokeWidth` scale gently with `count` (clamped to sensible
  min/max). This math is unit-tested with no DOM.
- **Render:** an `<svg>` with a line from center to each node (stroke width from
  layout), a center node showing the faculty's initials, and one node per
  coauthor. In-network nodes (`facultyId` set) render inside a
  `<Link href={/faculty/${facultyId}}>` with accent color; external nodes render
  muted and non-interactive. Each node has an SVG `<text>` label with the
  coauthor's name (doubles as accessible text).
- Card wrapper + heading "Frequent Coauthors" (matching the existing section
  styling: `bg-white border border-divider rounded-lg p-4 mt-4`).

### 3. Page wiring & cleanup

- **`web/app/faculty/[id]/page.tsx`:** replace
  `<CoauthorList coauthors={faculty.coauthors} />` with
  `<CoauthorGraph centerName={faculty.name} coauthors={faculty.coauthors} />`.
  Publications section and the OpenAlex link are unchanged.
- **Delete** `web/components/CoauthorList.tsx` and
  `web/components/CoauthorList.test.tsx` (the graph replaces the list).
  `getTopCoauthors` stays (used by the data layer).

## Testing

- `linkCoauthors`: unique match → id; absent name → null; ambiguous name
  (value null in index) → null; preserves name/count/order.
- `coauthorGraphLayout`: n nodes get distinct positions; `count` scales
  radius/strokeWidth monotonically; empty input → empty node list.
- `CoauthorGraph` render: an in-network coauthor renders an `<a href="/faculty/…">`;
  an external coauthor renders no link; empty coauthors → renders nothing;
  center shows the faculty initials.
- Build succeeds; browser check: a verified faculty shows the graph and clicking
  an in-network node navigates to that coauthor's faculty page.

## Scope / non-goals

- Ego graph only — no global collaboration network, no per-school graph.
- Exact-name matching only — no fuzzy/initial normalization.
- No new dependencies; no force-directed layout.
- No changes to the verified gate, publications, or the OpenAlex enrichment.

## Tech stack

Next.js 16 / React 19 / TypeScript, Vitest + @testing-library/react.
