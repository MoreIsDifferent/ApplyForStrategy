# Visual Redesign Design

## Goal

Restyle the Strategy PhD Faculty Finder Next.js app (`web/`) to use the warm, light visual language of "Yi's Personal Website" (`/Users/haoyi/Documents/PlaylistHY/Yi's Personal Website`): warm-white background, charcoal text, soft-blue accent, pill-style tags, card-based layouts, Inter font. The app currently uses plain Next.js/Tailwind defaults (Geist fonts, white/black/gray, unstyled borders).

Scope is **light theme only** — no dark mode toggle.

## Foundation: palette & typography

Replace the current minimal Tailwind v4 theme in `web/app/globals.css` with tokens matching the reference site:

```css
@theme inline {
  --color-warm-white: #FAFAF8;
  --color-charcoal: #1F2933;
  --color-gray-secondary: #52606D;
  --color-divider: #E6E8EB;
  --color-accent: #4B9CD3;
  --color-accent-soft: #E8F2FB;
  --color-accent-soft-text: #2b6f9e;
  --color-muted: #9AA5B1;
  --font-sans: var(--font-inter), sans-serif;
}
body {
  background: var(--color-warm-white);
  color: var(--color-charcoal);
}
```

`web/app/layout.tsx`: replace the `Geist`/`Geist_Mono` font imports with `Inter` from `next/font/google`, applied as the body font. Metadata title remains "Strategy PhD Faculty Finder".

These tokens become available as Tailwind utilities: `bg-warm-white`, `text-charcoal`, `text-gray-secondary`, `border-divider`, `bg-accent`, `text-accent`, `bg-accent-soft`, `text-accent-soft-text`, `text-muted`.

## Homepage: header & filter bar

`web/app/page.tsx` — plain title header, no nav chrome:

```tsx
<main className="max-w-3xl mx-auto px-6 py-8">
  <h1 className="text-2xl font-bold text-charcoal">Strategy PhD Faculty Finder</h1>
  <p className="text-sm text-gray-secondary mt-1 mb-6">
    Browse strategy faculty across top business schools
  </p>
  <FilterableFacultyList ... />
</main>
```

`web/components/FacetBar.tsx` — wraps facet columns in a single white card:

```tsx
<div className="bg-white border border-divider rounded-lg p-3 flex flex-wrap gap-4 mb-6">
  {/* FacetColumn x N */}
</div>
```

`web/components/FacetColumn.tsx` (single-level facets — Methodology, Geography, etc.):
- Small uppercase label: `text-[11px] font-bold tracking-wide text-gray-secondary`
- Each facet value rendered as a pill button. Unselected: `bg-white border border-divider text-charcoal`. Selected: `bg-accent text-white`.
- Count shown inline in the pill label, e.g. `Quantitative (40)`.

`web/components/TopicFacet.tsx` (two-level — categories with sub-topics):
- Top-level categories rendered as larger pills with a `▾`/`▸` expand indicator, same selected/unselected coloring as `FacetColumn` pills.
- Clicking the expand indicator (not the pill body) toggles whether sub-topics are shown — it does not change the filter selection.
- When expanded, sub-topic pills render in a row below, indented, using the smaller "tag" style: unselected = `bg-accent-soft text-accent-soft-text`, selected = `bg-accent text-white`.
- Clicking a sub-topic pill toggles that topic's filter selection directly.

This establishes a single pill-based interaction model across all facets, with the two-level Topic facet getting expand/collapse for its sub-topics.

## FacultyCard & ResultsList

`web/components/ResultsList.tsx` — single-column stack of cards:

```tsx
<div className="flex flex-col gap-3">
  {faculty.map((f) => <FacultyCard key={f.id} faculty={f} />)}
</div>
```

`web/components/FacultyCard.tsx`:

```tsx
<Link href={`/faculty/${faculty.id}`} className="block bg-white border border-divider rounded-lg p-4 hover:border-accent transition-colors">
  <div className="font-semibold text-charcoal text-[15px]">{faculty.name}</div>
  <div className="text-xs text-gray-secondary mt-0.5 mb-2">
    {faculty.title} — {faculty.school.name}
  </div>
  <div className="flex flex-wrap gap-1.5 mb-2">
    {faculty.topics.map((t) => (
      <span key={t.name} className="bg-accent-soft text-accent-soft-text rounded-full px-2.5 py-0.5 text-[11px]">
        {t.name}
      </span>
    ))}
  </div>
  {faculty.methodology && (
    <div className="text-[11px] text-muted">Methodology: {faculty.methodology}</div>
  )}
</Link>
```

The whole card is a link; hovering adds `border-accent` as a subtle highlight. Topic pills use the `accent-soft` tag style, consistent with the Topic facet's sub-topic pills.

## Faculty detail page

`web/app/faculty/[id]/page.tsx`:

```tsx
<main className="max-w-2xl mx-auto px-6 py-8">
  <Link href="/" className="text-sm text-accent hover:underline mb-4 inline-block">
    ← Back to all faculty
  </Link>

  <div className="flex items-center gap-4 mb-1">
    {faculty.photo_url ? (
      <img
        src={faculty.photo_url}
        alt={faculty.name}
        className="w-16 h-16 rounded-full object-cover border border-divider"
      />
    ) : (
      <div className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
        {faculty.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
      </div>
    )}
    <div>
      <h1 className="text-2xl font-bold text-charcoal">{faculty.name}</h1>
      <p className="text-sm text-gray-secondary">{faculty.title} — {faculty.school.name}</p>
    </div>
  </div>

  <div className="bg-white border border-divider rounded-lg p-4 mt-4">
    <dl className="space-y-3 text-sm">
      <div>
        <dt className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-1">PhD Institution</dt>
        <dd className="text-charcoal">{faculty.phd_institution ?? 'Unknown'}</dd>
      </div>
      <div>
        <dt className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-1">Methodology</dt>
        <dd className="text-charcoal">{faculty.methodology ?? 'Unknown'}</dd>
      </div>
      <div>
        <dt className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-1">Research Topics</dt>
        <dd className="flex flex-wrap gap-1.5">
          {faculty.topics.map((t) => (
            <span key={t.name} className="bg-accent-soft text-accent-soft-text rounded-full px-2.5 py-0.5 text-[11px]">{t.name}</span>
          ))}
        </dd>
      </div>
      <div>
        <dt className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-1">Theories</dt>
        <dd className="text-charcoal">{faculty.theories.length > 0 ? faculty.theories.join(', ') : 'Unknown'}</dd>
      </div>
    </dl>
  </div>

  <div className="flex gap-4 mt-4 text-sm">
    {faculty.school_profile_url && (
      <a className="text-accent hover:underline" href={faculty.school_profile_url}>School Profile</a>
    )}
    {faculty.personal_website_url && (
      <a className="text-accent hover:underline" href={faculty.personal_website_url}>Personal Website</a>
    )}
    {faculty.google_scholar_url && (
      <a className="text-accent hover:underline" href={faculty.google_scholar_url}>Google Scholar</a>
    )}
  </div>
</main>
```

`faculty.photo_url: string | null` already exists on the `Faculty` type (`web/lib/types.ts:28`) and is read from Supabase in `web/lib/data.ts`. It is currently unpopulated for all records (sample data and live data both have `null`), but the UI must handle both states: render the photo when present, otherwise fall back to a circular initials avatar built from the first letters of the first and last name (using the `bg-accent`/`text-white` styling). No data-layer changes are needed for this redesign — populating `photo_url` is out of scope.

## School page (Rankings + Portfolio Chart)

`web/app/schools/[slug]/page.tsx`:

```tsx
<main className="max-w-5xl mx-auto px-6 py-8">
  <Link href="/" className="text-sm text-accent hover:underline mb-4 inline-block">
    ← Back to all faculty
  </Link>
  <h1 className="text-2xl font-bold text-charcoal mb-1">{school.name}</h1>
  <p className="text-sm text-gray-secondary mb-6">{school.geography}</p>

  <h2 className="text-lg font-semibold text-charcoal mb-2">Rankings</h2>
  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
    {[
      { label: 'UTD Top 100', value: school.ranking_utd },
      { label: 'TAMU', value: school.ranking_tamuga },
      { label: 'US News', value: school.ranking_usnews },
      { label: 'QS', value: school.ranking_qs },
    ].map(({ label, value }) => (
      <div key={label} className="bg-white border border-divider rounded-lg p-3 text-center">
        <dt className="text-[11px] uppercase tracking-wide text-gray-secondary">{label}</dt>
        <dd className="text-xl font-semibold text-charcoal">{value ?? '—'}</dd>
      </div>
    ))}
  </dl>

  <h2 className="text-lg font-semibold text-charcoal mb-2">Research Portfolio</h2>
  <div className="bg-white border border-divider rounded-lg p-4 mb-8">
    <PortfolioChart data={distribution} />
  </div>

  <h2 className="text-lg font-semibold text-charcoal mb-2">Faculty</h2>
  <ResultsList faculty={facultyAtSchool} />
</main>
```

`web/components/PortfolioChart.tsx` — replace the hardcoded color array (`['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777']`) with a palette derived from the accent blue, harmonious with the warm-white theme:

```ts
const COLORS = ['#4B9CD3', '#7CB9E8', '#2b6f9e', '#9AA5B1', '#A8D5BA', '#E8B86D', '#D88C8C'];
```

## Files touched

- `web/app/globals.css` — new design tokens
- `web/app/layout.tsx` — Inter font swap
- `web/app/page.tsx` — header + layout
- `web/components/FacetBar.tsx` — card wrapper
- `web/components/FacetColumn.tsx` — pill styling
- `web/components/TopicFacet.tsx` — two-level pill styling with expand/collapse
- `web/components/ResultsList.tsx` — spacing/layout
- `web/components/FacultyCard.tsx` — card restyle with topic pills
- `web/app/faculty/[id]/page.tsx` — detail page restyle, photo/avatar
- `web/app/schools/[slug]/page.tsx` — school page restyle (rankings, portfolio chart sections)
- `web/components/PortfolioChart.tsx` — color palette

## Out of scope

- Dark mode / theme toggle
- Populating `photo_url` data (scraper changes)
- Any new facets, filters, or data fields beyond what already exists
