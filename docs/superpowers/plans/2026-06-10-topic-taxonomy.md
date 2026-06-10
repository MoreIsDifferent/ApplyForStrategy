# Topic Taxonomy & Filter Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a category/canonical-name taxonomy layer to the `topics` table, switch all facet filtering to AND/intersection semantics, and replace the flat Topic facet with a two-level (category → topic) collapsible, scrollable facet, including a category-grouped portfolio chart.

**Architecture:** Extend the existing `topics` table with `canonical_name`, `category`, `needs_categorization` columns (no new join table). A one-time LLM-assisted script (`scraper/scraper/categorize_topics.py`) backfills these columns. The web app's `Faculty.topics` becomes `Topic[]` (`{name, category}`, deduped by canonical name), `web/lib/filtering.ts` switches `matchesField` from `.some` to `.every` and expands the `topics` value-space to include both topic names and category names, and a new `TopicFacet` component renders the two-level UI. `web/lib/portfolio.ts` groups the per-school chart by `category`.

**Tech Stack:** Next.js (App Router), React/Vitest/Testing Library, Supabase (Postgres), Python scraper with OpenAI-compatible LLM client.

---

## Task 1: Supabase migration — topic taxonomy columns

**Files:**
- Create: `supabase/migrations/0002_add_topic_taxonomy.sql`
- Modify: `supabase/setup_combined.sql:1-23`

- [ ] **Step 1: Create the migration file**

```sql
alter table topics
  add column canonical_name text,
  add column category text,
  add column needs_categorization boolean not null default true;
```

Save this as `supabase/migrations/0002_add_topic_taxonomy.sql`.

- [ ] **Step 2: Update `supabase/setup_combined.sql` to match (for fresh project setups)**

Update the header comment and the `topics` table definition:

```sql
-- Combined setup script: run once in the Supabase SQL Editor for a fresh project.
-- Includes schema.sql + migrations/0001_add_bio_hash.sql + migrations/0002_add_topic_taxonomy.sql + school records (no placeholder faculty).
```

```sql
create table topics (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  canonical_name text,
  category text,
  needs_categorization boolean not null default true
);
```

- [ ] **Step 3: Run the migration against the live Supabase project**

Run: `psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_add_topic_taxonomy.sql`

(If `SUPABASE_DB_URL` isn't available, paste the SQL from Step 1 into the Supabase SQL Editor for project `fnksonmxjqnirhiwdjlk` and run it there.)

Expected: `ALTER TABLE` succeeds with no error. Verify with:

```sql
select column_name, data_type, column_default from information_schema.columns where table_name = 'topics';
```

Expected columns: `id`, `name`, `canonical_name`, `category`, `needs_categorization` (default `true`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_add_topic_taxonomy.sql supabase/setup_combined.sql
git commit -m "feat(db): add canonical_name/category/needs_categorization to topics table"
```

---

## Task 2: `web/lib/types.ts` — add `Topic` interface

**Files:**
- Modify: `web/lib/types.ts`

- [ ] **Step 1: Add the `Topic` interface and update `Faculty.topics`**

Replace the full contents of `web/lib/types.ts` with:

```ts
export interface School {
  id: string;
  name: string;
  slug: string;
  geography: string;
  ranking_utd: number | null;
  ranking_tamuga: number | null;
  ranking_qs: number | null;
  ranking_usnews: number | null;
  placement_summary: string | null;
  website_url: string | null;
  logo_url: string | null;
}

export type Methodology = 'Quantitative' | 'Qualitative' | 'Mixed' | 'Experimental' | 'Computational';

export interface Topic {
  name: string;
  category: string;
}

export interface Faculty {
  id: string;
  name: string;
  school: School;
  title: string | null;
  phd_institution: string | null;
  photo_url: string | null;
  school_profile_url: string | null;
  personal_website_url: string | null;
  google_scholar_url: string | null;
  methodology: Methodology | null;
  topics: Topic[];
  theories: string[];
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/types.ts
git commit -m "feat(web): add Topic interface and change Faculty.topics to Topic[]"
```

(This will break the build until Tasks 3-10 update all consumers — that's expected; subsequent tasks fix it incrementally.)

---

## Task 3: `web/lib/sampleData.ts` — convert topics to `Topic[]`

**Files:**
- Modify: `web/lib/sampleData.ts`

- [ ] **Step 1: Replace each faculty record's `topics: [...]` array of strings with `Topic[]` objects**

Use this mapping from old topic string to `{name, category}`:

| Old string | New `Topic` |
|---|---|
| `'Innovation'` | `{ name: 'Innovation', category: 'Innovation & Technology' }` |
| `'Corporate Strategy'` | `{ name: 'Corporate Strategy', category: 'Corporate Strategy & Governance' }` |
| `'M&A'` | `{ name: 'M&A', category: 'Corporate Strategy & Governance' }` |
| `'Entrepreneurship'` | `{ name: 'Entrepreneurship', category: 'Entrepreneurship & New Ventures' }` |
| `'Org Theory'` | `{ name: 'Org Theory', category: 'Organizational Behavior & Design' }` |

Replace lines 51-65 (the `allFaculty` array body) with:

```ts
export const allFaculty: Faculty[] = [
  { id: 'f1', name: 'Jane Doe', school: wharton, title: 'Assistant Professor', phd_institution: 'MIT', photo_url: null, school_profile_url: 'https://www.wharton.upenn.edu/faculty/jane-doe', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: [{ name: 'Innovation', category: 'Innovation & Technology' }, { name: 'Corporate Strategy', category: 'Corporate Strategy & Governance' }], theories: ['RBV'] },
  { id: 'f2', name: 'Robert Chen', school: wharton, title: 'Associate Professor', phd_institution: 'Stanford', photo_url: null, school_profile_url: 'https://www.wharton.upenn.edu/faculty/robert-chen', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: [{ name: 'M&A', category: 'Corporate Strategy & Governance' }, { name: 'Corporate Strategy', category: 'Corporate Strategy & Governance' }], theories: ['Agency Theory'] },
  { id: 'f3', name: 'Maria Garcia', school: wharton, title: 'Professor', phd_institution: 'Harvard', photo_url: null, school_profile_url: 'https://www.wharton.upenn.edu/faculty/maria-garcia', personal_website_url: null, google_scholar_url: null, methodology: 'Mixed', topics: [{ name: 'Entrepreneurship', category: 'Entrepreneurship & New Ventures' }, { name: 'Innovation', category: 'Innovation & Technology' }], theories: ['RBV', 'Behavioral Theory'] },
  { id: 'f4', name: 'David Kim', school: wharton, title: 'Assistant Professor', phd_institution: 'UC Berkeley', photo_url: null, school_profile_url: 'https://www.wharton.upenn.edu/faculty/david-kim', personal_website_url: null, google_scholar_url: null, methodology: 'Qualitative', topics: [{ name: 'Org Theory', category: 'Organizational Behavior & Design' }], theories: ['Institutional Theory'] },
  { id: 'f5', name: 'Sarah Lee', school: wharton, title: 'Associate Professor', phd_institution: 'Columbia', photo_url: null, school_profile_url: 'https://www.wharton.upenn.edu/faculty/sarah-lee', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: [{ name: 'Innovation', category: 'Innovation & Technology' }], theories: ['RBV'] },

  { id: 'f6', name: 'Michael Brown', school: booth, title: 'Professor', phd_institution: 'University of Chicago', photo_url: null, school_profile_url: 'https://www.chicagobooth.edu/faculty/michael-brown', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: [{ name: 'M&A', category: 'Corporate Strategy & Governance' }, { name: 'Corporate Strategy', category: 'Corporate Strategy & Governance' }], theories: ['Agency Theory', 'RBV'] },
  { id: 'f7', name: 'Emily Wilson', school: booth, title: 'Assistant Professor', phd_institution: 'Northwestern', photo_url: null, school_profile_url: 'https://www.chicagobooth.edu/faculty/emily-wilson', personal_website_url: null, google_scholar_url: null, methodology: 'Mixed', topics: [{ name: 'Entrepreneurship', category: 'Entrepreneurship & New Ventures' }], theories: ['Behavioral Theory'] },
  { id: 'f8', name: 'James Taylor', school: booth, title: 'Associate Professor', phd_institution: 'Wharton', photo_url: null, school_profile_url: 'https://www.chicagobooth.edu/faculty/james-taylor', personal_website_url: null, google_scholar_url: null, methodology: 'Qualitative', topics: [{ name: 'Org Theory', category: 'Organizational Behavior & Design' }, { name: 'Corporate Strategy', category: 'Corporate Strategy & Governance' }], theories: ['Institutional Theory'] },
  { id: 'f9', name: 'Linda Martinez', school: booth, title: 'Professor', phd_institution: 'Stanford', photo_url: null, school_profile_url: 'https://www.chicagobooth.edu/faculty/linda-martinez', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: [{ name: 'Innovation', category: 'Innovation & Technology' }, { name: 'Entrepreneurship', category: 'Entrepreneurship & New Ventures' }], theories: ['RBV'] },
  { id: 'f10', name: 'Kevin Anderson', school: booth, title: 'Assistant Professor', phd_institution: 'MIT', photo_url: null, school_profile_url: 'https://www.chicagobooth.edu/faculty/kevin-anderson', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: [{ name: 'M&A', category: 'Corporate Strategy & Governance' }], theories: ['Agency Theory'] },

  { id: 'f11', name: 'Anna Thompson', school: ucla, title: 'Associate Professor', phd_institution: 'UC Berkeley', photo_url: null, school_profile_url: 'https://www.anderson.ucla.edu/faculty/anna-thompson', personal_website_url: null, google_scholar_url: null, methodology: 'Mixed', topics: [{ name: 'Innovation', category: 'Innovation & Technology' }, { name: 'Org Theory', category: 'Organizational Behavior & Design' }], theories: ['Institutional Theory', 'RBV'] },
  { id: 'f12', name: 'Brian White', school: ucla, title: 'Professor', phd_institution: 'UCLA', photo_url: null, school_profile_url: 'https://www.anderson.ucla.edu/faculty/brian-white', personal_website_url: null, google_scholar_url: null, methodology: 'Qualitative', topics: [{ name: 'Entrepreneurship', category: 'Entrepreneurship & New Ventures' }, { name: 'Corporate Strategy', category: 'Corporate Strategy & Governance' }], theories: ['Behavioral Theory'] },
  { id: 'f13', name: 'Catherine Harris', school: ucla, title: 'Assistant Professor', phd_institution: 'Yale', photo_url: null, school_profile_url: 'https://www.anderson.ucla.edu/faculty/catherine-harris', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: [{ name: 'M&A', category: 'Corporate Strategy & Governance' }, { name: 'Innovation', category: 'Innovation & Technology' }], theories: ['Agency Theory'] },
  { id: 'f14', name: 'Daniel Clark', school: ucla, title: 'Associate Professor', phd_institution: 'Duke', photo_url: null, school_profile_url: 'https://www.anderson.ucla.edu/faculty/daniel-clark', personal_website_url: null, google_scholar_url: null, methodology: 'Qualitative', topics: [{ name: 'Org Theory', category: 'Organizational Behavior & Design' }], theories: ['Institutional Theory'] },
  { id: 'f15', name: 'Rachel Lewis', school: ucla, title: 'Professor', phd_institution: 'Cornell', photo_url: null, school_profile_url: 'https://www.anderson.ucla.edu/faculty/rachel-lewis', personal_website_url: null, google_scholar_url: null, methodology: 'Mixed', topics: [{ name: 'Corporate Strategy', category: 'Corporate Strategy & Governance' }, { name: 'Innovation', category: 'Innovation & Technology' }], theories: ['RBV', 'Agency Theory'] },
];
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/sampleData.ts
git commit -m "feat(web): convert sampleData topics to Topic[] objects"
```

---

## Task 4: `web/lib/filtering.ts` — AND logic, topic value-space, taxonomy helper

**Files:**
- Modify: `web/lib/filtering.ts`
- Modify: `web/lib/filtering.test.ts`

- [ ] **Step 1: Rewrite `web/lib/filtering.test.ts`**

Replace the full file with:

```ts
import { describe, it, expect } from 'vitest';
import { applyFilters, getFacetCounts, getTopicTaxonomy, EMPTY_FILTERS } from './filtering';
import type { Faculty, School } from './types';

const schoolA: School = {
  id: 's1', name: 'School A', slug: 'school-a', geography: 'Northeast',
  ranking_utd: 1, ranking_tamuga: 1, ranking_qs: 1, ranking_usnews: 1,
  placement_summary: null, website_url: null, logo_url: null,
};

const schoolB: School = {
  id: 's2', name: 'School B', slug: 'school-b', geography: 'Midwest',
  ranking_utd: 2, ranking_tamuga: 2, ranking_qs: 2, ranking_usnews: 2,
  placement_summary: null, website_url: null, logo_url: null,
};

function makeFaculty(overrides: Partial<Faculty> & { id: string; name: string }): Faculty {
  return {
    school: schoolA,
    title: 'Assistant Professor',
    phd_institution: 'Test University',
    photo_url: null,
    school_profile_url: null,
    personal_website_url: null,
    google_scholar_url: null,
    methodology: 'Quantitative',
    topics: [],
    theories: [],
    ...overrides,
  };
}

const INNOVATION = { name: 'Innovation', category: 'Innovation & Technology' };
const MA = { name: 'M&A', category: 'Corporate Strategy & Governance' };

const faculty: Faculty[] = [
  makeFaculty({ id: 'f1', name: 'Alice', school: schoolA, topics: [INNOVATION], theories: ['RBV'], methodology: 'Quantitative' }),
  makeFaculty({ id: 'f2', name: 'Bob', school: schoolA, topics: [MA], theories: ['Agency Theory'], methodology: 'Qualitative' }),
  makeFaculty({ id: 'f3', name: 'Carol', school: schoolB, topics: [INNOVATION, MA], theories: ['RBV'], methodology: 'Mixed' }),
];

describe('applyFilters', () => {
  it('returns all faculty when no filters are set', () => {
    expect(applyFilters(faculty, EMPTY_FILTERS)).toHaveLength(3);
  });

  it('filters by a single topic', () => {
    const result = applyFilters(faculty, { ...EMPTY_FILTERS, topics: ['M&A'] });
    expect(result.map((f) => f.id)).toEqual(['f2', 'f3']);
  });

  it('combines filters across different facets with AND logic', () => {
    const result = applyFilters(faculty, { ...EMPTY_FILTERS, topics: ['Innovation'], methodology: ['Mixed'] });
    expect(result.map((f) => f.id)).toEqual(['f3']);
  });

  it('treats multiple values within the same facet as AND/intersection logic', () => {
    const result = applyFilters(faculty, { ...EMPTY_FILTERS, topics: ['Innovation', 'M&A'] });
    expect(result.map((f) => f.id)).toEqual(['f3']);
  });

  it('matches faculty via category-level topic selection', () => {
    const result = applyFilters(faculty, { ...EMPTY_FILTERS, topics: ['Innovation & Technology'] });
    expect(result.map((f) => f.id)).toEqual(['f1', 'f3']);
  });

  it('combines a category-level selection with a specific-topic selection using AND', () => {
    const result = applyFilters(faculty, { ...EMPTY_FILTERS, topics: ['Innovation & Technology', 'M&A'] });
    expect(result.map((f) => f.id)).toEqual(['f3']);
  });

  it('filters by geography derived from the faculty school', () => {
    const result = applyFilters(faculty, { ...EMPTY_FILTERS, geography: ['Midwest'] });
    expect(result.map((f) => f.id)).toEqual(['f3']);
  });
});

describe('getFacetCounts', () => {
  it("counts topic names and categories for a facet ignoring that facet's own active filters", () => {
    const counts = getFacetCounts(faculty, { ...EMPTY_FILTERS, topics: ['Innovation'] }, 'topics');
    expect(counts).toEqual({
      Innovation: 2,
      'Innovation & Technology': 2,
      'M&A': 2,
      'Corporate Strategy & Governance': 2,
    });
  });

  it('respects filters from other facets when counting', () => {
    const counts = getFacetCounts(faculty, { ...EMPTY_FILTERS, methodology: ['Mixed'] }, 'topics');
    expect(counts).toEqual({
      Innovation: 1,
      'Innovation & Technology': 1,
      'M&A': 1,
      'Corporate Strategy & Governance': 1,
    });
  });
});

describe('getTopicTaxonomy', () => {
  it('groups unique topic names by category, sorted alphabetically with Other last', () => {
    const taxonomy = getTopicTaxonomy([
      ...faculty,
      makeFaculty({ id: 'f4', name: 'Dave', topics: [{ name: 'Misc', category: 'Other' }] }),
    ]);
    expect(taxonomy).toEqual([
      { category: 'Corporate Strategy & Governance', topics: ['M&A'] },
      { category: 'Innovation & Technology', topics: ['Innovation'] },
      { category: 'Other', topics: ['Misc'] },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- filtering.test.ts`
Expected: FAIL — `getTopicTaxonomy` is not exported, and the AND/category-related assertions fail against the current implementation.

- [ ] **Step 3: Rewrite `web/lib/filtering.ts`**

Replace the full file with:

```ts
import type { Faculty } from './types';

export type FacetField = 'topics' | 'theories' | 'methodology' | 'geography';

export interface FacetFilters {
  topics: string[];
  theories: string[];
  methodology: string[];
  geography: string[];
}

export const EMPTY_FILTERS: FacetFilters = {
  topics: [],
  theories: [],
  methodology: [],
  geography: [],
};

export interface TopicCategoryGroup {
  category: string;
  topics: string[];
}

const ALL_FIELDS: FacetField[] = ['topics', 'theories', 'methodology', 'geography'];

export function valuesForField(faculty: Faculty, field: FacetField): string[] {
  switch (field) {
    case 'topics': {
      const values = new Set<string>();
      for (const t of faculty.topics) {
        values.add(t.name);
        values.add(t.category);
      }
      return Array.from(values);
    }
    case 'theories':
      return faculty.theories;
    case 'methodology':
      return faculty.methodology ? [faculty.methodology] : [];
    case 'geography':
      return [faculty.school.geography];
  }
}

function matchesField(faculty: Faculty, field: FacetField, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const values = valuesForField(faculty, field);
  return selected.every((v) => values.includes(v));
}

export function applyFilters(faculty: Faculty[], filters: FacetFilters): Faculty[] {
  return faculty.filter((f) => ALL_FIELDS.every((field) => matchesField(f, field, filters[field])));
}

export function getFacetCounts(
  faculty: Faculty[],
  filters: FacetFilters,
  field: FacetField
): Record<string, number> {
  const otherFilters: FacetFilters = { ...filters, [field]: [] };
  const filtered = applyFilters(faculty, otherFilters);
  const counts: Record<string, number> = {};
  for (const f of filtered) {
    for (const value of valuesForField(f, field)) {
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }
  return counts;
}

export function getTopicTaxonomy(faculty: Faculty[]): TopicCategoryGroup[] {
  const map = new Map<string, Set<string>>();
  for (const f of faculty) {
    for (const t of f.topics) {
      if (!map.has(t.category)) map.set(t.category, new Set());
      map.get(t.category)!.add(t.name);
    }
  }
  return Array.from(map.entries())
    .map(([category, topics]) => ({ category, topics: Array.from(topics).sort() }))
    .sort((a, b) => {
      if (a.category === 'Other') return 1;
      if (b.category === 'Other') return -1;
      return a.category.localeCompare(b.category);
    });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test -- filtering.test.ts`
Expected: PASS (all `applyFilters`, `getFacetCounts`, `getTopicTaxonomy` tests green)

- [ ] **Step 5: Commit**

```bash
git add web/lib/filtering.ts web/lib/filtering.test.ts
git commit -m "feat(web): switch facet filtering to AND logic and add topic taxonomy helper"
```

---

## Task 5: `web/lib/portfolio.ts` — group portfolio chart by category

**Files:**
- Modify: `web/lib/portfolio.ts`
- Modify: `web/lib/portfolio.test.ts`

- [ ] **Step 1: Rewrite `web/lib/portfolio.test.ts`**

Replace the full file with:

```ts
import { describe, it, expect } from 'vitest';
import { getTopicDistribution } from './portfolio';
import type { Faculty, Topic } from './types';

function makeFaculty(topics: Topic[]): Faculty {
  return {
    id: Math.random().toString(),
    name: 'Test',
    school: {
      id: 's1', name: 'School', slug: 'school', geography: 'Northeast',
      ranking_utd: null, ranking_tamuga: null, ranking_qs: null, ranking_usnews: null,
      placement_summary: null, website_url: null, logo_url: null,
    },
    title: 'Assistant Professor',
    phd_institution: 'Test University',
    photo_url: null,
    school_profile_url: null,
    personal_website_url: null,
    google_scholar_url: null,
    methodology: 'Quantitative',
    topics,
    theories: [],
  };
}

describe('getTopicDistribution', () => {
  it('returns an empty array for no faculty', () => {
    expect(getTopicDistribution([])).toEqual([]);
  });

  it('counts topic mentions by category and sorts by count descending', () => {
    const faculty = [
      makeFaculty([
        { name: 'Innovation', category: 'Innovation & Technology' },
        { name: 'Corporate Strategy', category: 'Corporate Strategy & Governance' },
      ]),
      makeFaculty([
        { name: 'M&A', category: 'Corporate Strategy & Governance' },
        { name: 'Corporate Strategy', category: 'Corporate Strategy & Governance' },
      ]),
      makeFaculty([{ name: 'Innovation', category: 'Innovation & Technology' }]),
    ];
    expect(getTopicDistribution(faculty)).toEqual([
      { topic: 'Corporate Strategy & Governance', count: 3, percentage: 60 },
      { topic: 'Innovation & Technology', count: 2, percentage: 40 },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- portfolio.test.ts`
Expected: FAIL — type error / mismatch because `getTopicDistribution` still groups by raw topic name (`Innovation`, `Corporate Strategy`, `M&A` as separate entries) instead of category.

- [ ] **Step 3: Update `web/lib/portfolio.ts`**

Replace the full file with:

```ts
import type { Faculty } from './types';

export interface TopicDistributionEntry {
  topic: string;
  count: number;
  percentage: number;
}

export function getTopicDistribution(faculty: Faculty[]): TopicDistributionEntry[] {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const f of faculty) {
    for (const topic of f.topics) {
      counts[topic.category] = (counts[topic.category] ?? 0) + 1;
      total += 1;
    }
  }
  return Object.entries(counts)
    .map(([topic, count]) => ({
      topic,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test -- portfolio.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/lib/portfolio.ts web/lib/portfolio.test.ts
git commit -m "feat(web): group portfolio chart distribution by topic category"
```

---

## Task 6: `web/lib/data.ts` — fetch and dedupe canonical topics

**Files:**
- Modify: `web/lib/data.ts`

- [ ] **Step 1: Update the `FacultyRow` interface, query, and `toFaculty` mapping**

In `web/lib/data.ts`, change the import line to also bring in `Topic`:

```ts
import type { Faculty, Methodology, School, Topic } from './types';
```

Change the `faculty_topics` field of `FacultyRow` (currently `{ topics: { name: string } | null }[]`) to:

```ts
  faculty_topics: {
    topics: { name: string; canonical_name: string | null; category: string | null } | null;
  }[];
```

Change the `toFaculty` function's `topics` mapping. Replace:

```ts
    topics: row.faculty_topics.map((ft) => ft.topics?.name).filter((name): name is string => !!name),
```

with:

```ts
    topics: dedupeTopics(row.faculty_topics),
```

Add a new helper function above `toFaculty`:

```ts
function dedupeTopics(faculty_topics: FacultyRow['faculty_topics']): Topic[] {
  const map = new Map<string, Topic>();
  for (const ft of faculty_topics) {
    if (!ft.topics) continue;
    const name = ft.topics.canonical_name ?? ft.topics.name;
    const category = ft.topics.category ?? 'Other';
    map.set(name, { name, category });
  }
  return Array.from(map.values());
}
```

Update the `getAllFaculty` query's select string. Replace:

```ts
    .select(
      '*, schools(*), faculty_topics(topics(name)), faculty_theories(theories(name))'
    )
```

with:

```ts
    .select(
      '*, schools(*), faculty_topics(topics(name, canonical_name, category)), faculty_theories(theories(name))'
    )
```

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: No errors related to `web/lib/data.ts`. (Other files may still error until subsequent tasks complete — if so, note which files and continue; this task only needs `data.ts` itself to be correct.)

- [ ] **Step 3: Commit**

```bash
git add web/lib/data.ts
git commit -m "feat(web): map faculty topics to deduped canonical Topic[] in data layer"
```

---

## Task 7: `web/components/FacultyCard.tsx` — render `Topic.name`

**Files:**
- Modify: `web/components/FacultyCard.tsx`
- Modify: `web/components/FacultyCard.test.tsx`

- [ ] **Step 1: Update `web/components/FacultyCard.test.tsx`**

In the `for (const topic of faculty.topics)` loop, change `screen.getByText(topic)` to `screen.getByText(topic.name)`:

```ts
    for (const topic of faculty.topics) {
      expect(screen.getByText(topic.name)).toBeInTheDocument();
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npm test -- FacultyCard.test.tsx`
Expected: FAIL — `screen.getByText(topic.name)` doesn't find text because `FacultyCard` currently renders `Topic` objects directly (e.g. `[object Object]`) in the tag list.

- [ ] **Step 3: Update `web/components/FacultyCard.tsx`**

Replace:

```tsx
        {[...faculty.topics, ...faculty.theories].map((tag) => (
```

with:

```tsx
        {[...faculty.topics.map((t) => t.name), ...faculty.theories].map((tag) => (
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npm test -- FacultyCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/components/FacultyCard.tsx web/components/FacultyCard.test.tsx
git commit -m "feat(web): render topic names instead of Topic objects in FacultyCard"
```

---

## Task 8: `web/app/faculty/[id]/page.tsx` — render topic names

**Files:**
- Modify: `web/app/faculty/[id]/page.tsx:42`

- [ ] **Step 1: Update the Research Topics row**

Replace:

```tsx
          <dd>{faculty.topics.length > 0 ? faculty.topics.join(', ') : 'Unknown'}</dd>
```

with:

```tsx
          <dd>{faculty.topics.length > 0 ? faculty.topics.map((t) => t.name).join(', ') : 'Unknown'}</dd>
```

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no error referencing `app/faculty/[id]/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add "web/app/faculty/[id]/page.tsx"
git commit -m "fix(web): render topic names on faculty detail page"
```

---

## Task 9: New `TopicFacet` component (two-level, scrollable)

**Files:**
- Create: `web/components/TopicFacet.tsx`
- Create: `web/components/TopicFacet.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/components/TopicFacet.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopicFacet } from './TopicFacet';

const groups = [
  { category: 'Corporate Strategy & Governance', topics: ['Corporate Strategy', 'M&A'] },
  { category: 'Innovation & Technology', topics: ['Innovation'] },
];

const counts = {
  'Corporate Strategy & Governance': 3,
  'Corporate Strategy': 2,
  'M&A': 2,
  'Innovation & Technology': 2,
  Innovation: 2,
};

describe('TopicFacet', () => {
  it('renders categories collapsed by default with counts', () => {
    render(<TopicFacet groups={groups} counts={counts} selected={[]} onToggle={() => {}} />);
    expect(screen.getByText('Corporate Strategy & Governance')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
    expect(screen.queryByText('M&A')).not.toBeInTheDocument();
  });

  it('expands a category to reveal its topics', async () => {
    render(<TopicFacet groups={groups} counts={counts} selected={[]} onToggle={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /Toggle Corporate Strategy & Governance/i }));
    expect(screen.getByText('M&A')).toBeInTheDocument();
    expect(screen.getByText('Corporate Strategy')).toBeInTheDocument();
  });

  it('calls onToggle with the category name when its checkbox is clicked', async () => {
    const onToggle = vi.fn();
    render(<TopicFacet groups={groups} counts={counts} selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Corporate Strategy & Governance/i }));
    expect(onToggle).toHaveBeenCalledWith('Corporate Strategy & Governance');
  });

  it('calls onToggle with the topic name when an expanded topic checkbox is clicked', async () => {
    const onToggle = vi.fn();
    render(<TopicFacet groups={groups} counts={counts} selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /Toggle Corporate Strategy & Governance/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: /^M&A/i }));
    expect(onToggle).toHaveBeenCalledWith('M&A');
  });

  it('hides categories with zero count', () => {
    const zeroCounts = { ...counts, 'Innovation & Technology': 0, Innovation: 0 };
    render(<TopicFacet groups={groups} counts={zeroCounts} selected={[]} onToggle={() => {}} />);
    expect(screen.queryByText('Innovation & Technology')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npm test -- TopicFacet.test.tsx`
Expected: FAIL — `Cannot find module './TopicFacet'`

- [ ] **Step 3: Create `web/components/TopicFacet.tsx`**

```tsx
'use client';

import { useState } from 'react';
import type { TopicCategoryGroup } from '@/lib/filtering';

interface TopicFacetProps {
  groups: TopicCategoryGroup[];
  counts: Record<string, number>;
  selected: string[];
  onToggle: (value: string) => void;
}

export function TopicFacet({ groups, counts, selected, onToggle }: TopicFacetProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(category: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  const visibleGroups = groups
    .map((group) => ({
      category: group.category,
      count: counts[group.category] ?? 0,
      topics: group.topics
        .filter((topic) => (counts[topic] ?? 0) > 0)
        .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b)),
    }))
    .filter((group) => group.count > 0);

  return (
    <div className="flex-1 min-w-[200px]">
      <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">Topic</h3>
      <ul className="space-y-1 max-h-80 overflow-y-auto pr-2">
        {visibleGroups.map((group) => (
          <li key={group.category}>
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                aria-label={`Toggle ${group.category}`}
                onClick={() => toggleExpanded(group.category)}
                className="text-gray-400 w-4 text-left"
              >
                {expanded.has(group.category) ? '−' : '+'}
              </button>
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={selected.includes(group.category)}
                  onChange={() => onToggle(group.category)}
                />
                <span>{group.category}</span>
                <span className="text-gray-400">({group.count})</span>
              </label>
            </div>
            {expanded.has(group.category) && (
              <ul className="ml-6 space-y-1 mt-1">
                {group.topics.map((topic) => (
                  <li key={topic}>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.includes(topic)}
                        onChange={() => onToggle(topic)}
                      />
                      <span>{topic}</span>
                      <span className="text-gray-400">({counts[topic] ?? 0})</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npm test -- TopicFacet.test.tsx`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add web/components/TopicFacet.tsx web/components/TopicFacet.test.tsx
git commit -m "feat(web): add two-level collapsible TopicFacet component"
```

---

## Task 10: `web/components/FilterableFacultyList.tsx` — wire up `TopicFacet`

**Files:**
- Modify: `web/components/FilterableFacultyList.tsx`
- Modify: `web/components/FilterableFacultyList.test.tsx`

- [ ] **Step 1: Rewrite `web/components/FilterableFacultyList.test.tsx`**

Replace the full file with:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterableFacultyList } from './FilterableFacultyList';
import { allFaculty } from '@/lib/sampleData';

describe('FilterableFacultyList', () => {
  it('shows all faculty by default', () => {
    render(<FilterableFacultyList faculty={allFaculty} />);
    expect(screen.getByText(`${allFaculty.length} results`)).toBeInTheDocument();
  });

  it('narrows results when a topic category facet is selected', async () => {
    render(<FilterableFacultyList faculty={allFaculty} />);
    const count = allFaculty.filter((f) =>
      f.topics.some((t) => t.category === 'Innovation & Technology')
    ).length;
    await userEvent.click(screen.getByRole('checkbox', { name: /Innovation & Technology/i }));
    expect(screen.getByText(`${count} results`)).toBeInTheDocument();
  });

  it('narrows results further when a specific topic within an expanded category is selected', async () => {
    render(<FilterableFacultyList faculty={allFaculty} />);
    await userEvent.click(screen.getByRole('button', { name: /Toggle Corporate Strategy & Governance/i }));
    const count = allFaculty.filter((f) => f.topics.some((t) => t.name === 'M&A')).length;
    await userEvent.click(screen.getByRole('checkbox', { name: /^M&A/i }));
    expect(screen.getByText(`${count} results`)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- FilterableFacultyList.test.tsx`
Expected: FAIL — there is no checkbox with accessible name `/Innovation & Technology/i` or a button `/Toggle Corporate Strategy & Governance/i` yet, since `topics` is still rendered via the generic `FacetColumn` with raw topic-name checkboxes.

- [ ] **Step 3: Update `web/components/FilterableFacultyList.tsx`**

Replace the full file with:

```tsx
'use client';

import { useMemo, useState } from 'react';
import type { Faculty } from '@/lib/types';
import {
  applyFilters,
  getFacetCounts,
  getTopicTaxonomy,
  valuesForField,
  EMPTY_FILTERS,
  type FacetField,
  type FacetFilters,
} from '@/lib/filtering';
import { FacetBar } from './FacetBar';
import { TopicFacet } from './TopicFacet';
import { ResultsList } from './ResultsList';

const FACET_DEFS: { field: FacetField; title: string }[] = [
  { field: 'theories', title: 'Theory' },
  { field: 'methodology', title: 'Methodology' },
  { field: 'geography', title: 'Geography' },
];

const ALL_FIELDS: FacetField[] = ['topics', 'theories', 'methodology', 'geography'];

function uniqueValues(faculty: Faculty[], field: FacetField): string[] {
  const set = new Set<string>();
  for (const f of faculty) {
    valuesForField(f, field).forEach((v) => set.add(v));
  }
  return Array.from(set).sort();
}

export function FilterableFacultyList({ faculty }: { faculty: Faculty[] }) {
  const [filters, setFilters] = useState<FacetFilters>(EMPTY_FILTERS);

  const facetDefinitions = useMemo(
    () =>
      FACET_DEFS.map((def) => ({
        ...def,
        options: uniqueValues(faculty, def.field),
      })),
    [faculty]
  );

  const topicGroups = useMemo(() => getTopicTaxonomy(faculty), [faculty]);

  const counts = useMemo(() => {
    const result = {} as Record<FacetField, Record<string, number>>;
    for (const field of ALL_FIELDS) {
      result[field] = getFacetCounts(faculty, filters, field);
    }
    return result;
  }, [faculty, filters]);

  const filtered = useMemo(() => applyFilters(faculty, filters), [faculty, filters]);

  function handleToggle(field: FacetField, value: string) {
    setFilters((prev) => {
      const current = prev[field];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-6 border-b pb-4 mb-4">
        <TopicFacet
          groups={topicGroups}
          counts={counts.topics}
          selected={filters.topics}
          onToggle={(value) => handleToggle('topics', value)}
        />
        <FacetBar
          facetDefinitions={facetDefinitions}
          filters={filters}
          counts={counts}
          onToggle={handleToggle}
        />
      </div>
      <ResultsList faculty={filtered} />
    </div>
  );
}
```

Note: `FacetBar` itself already wraps its columns in `flex flex-wrap gap-6 border-b pb-4 mb-4` — having `TopicFacet` rendered alongside it inside another flex container with the same classes would create nested borders/padding. Remove `FacetBar`'s own wrapper styling so the outer `div` here is the single source of layout.

- [ ] **Step 3a: Update `web/components/FacetBar.tsx` to remove its own wrapper styling**

Replace:

```tsx
  return (
    <div className="flex flex-wrap gap-6 border-b pb-4 mb-4">
      {facetDefinitions.map((def) => (
```

with:

```tsx
  return (
    <>
      {facetDefinitions.map((def) => (
```

And replace the closing:

```tsx
      ))}
    </div>
  );
}
```

with:

```tsx
      ))}
    </>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test -- FilterableFacultyList.test.tsx FacetBar.test.tsx`
Expected: PASS for all `FilterableFacultyList` tests. `FacetBar.test.tsx` should still PASS unchanged (it renders `FacetBar` directly and only checks for text/checkboxes, not the wrapper div).

- [ ] **Step 5: Run the full web test suite**

Run: `cd web && npm test`
Expected: All tests PASS.

- [ ] **Step 6: Type-check and build**

Run: `cd web && npx tsc --noEmit && npm run build`
Expected: No type errors, build succeeds (build will hit Supabase using `web/.env.local` for SSG — this is expected and already working from the prior session).

- [ ] **Step 7: Commit**

```bash
git add web/components/FilterableFacultyList.tsx web/components/FilterableFacultyList.test.tsx web/components/FacetBar.tsx
git commit -m "feat(web): integrate two-level TopicFacet into FilterableFacultyList"
```

---

## Task 11: Scraper categorization script

**Files:**
- Create: `scraper/scraper/categorize_topics.py`
- Create: `scraper/tests/test_categorize_topics.py`

- [ ] **Step 1: Write the failing tests**

Create `scraper/tests/test_categorize_topics.py`:

```python
import json
from unittest.mock import MagicMock

from scraper.categorize_topics import BATCH_SIZE, categorize_topics


def _mock_response(content: dict) -> MagicMock:
    response = MagicMock()
    response.choices = [MagicMock(message=MagicMock(content=json.dumps(content)))]
    return response


def test_categorize_topics_sends_single_batch_for_small_input():
    client = MagicMock()
    client.chat.completions.create.return_value = _mock_response(
        {
            "topics": [
                {
                    "name": "Behavior Change",
                    "canonical_name": "Behavioral Change",
                    "category": "Decision Making & Behavioral Science",
                },
                {
                    "name": "Behavioral Change",
                    "canonical_name": "Behavioral Change",
                    "category": "Decision Making & Behavioral Science",
                },
            ]
        }
    )

    result = categorize_topics(["Behavior Change", "Behavioral Change"], client, "test-model")

    assert result == [
        {
            "name": "Behavior Change",
            "canonical_name": "Behavioral Change",
            "category": "Decision Making & Behavioral Science",
        },
        {
            "name": "Behavioral Change",
            "canonical_name": "Behavioral Change",
            "category": "Decision Making & Behavioral Science",
        },
    ]
    client.chat.completions.create.assert_called_once()


def test_categorize_topics_splits_into_batches():
    client = MagicMock()
    client.chat.completions.create.side_effect = [
        _mock_response(
            {
                "topics": [
                    {"name": f"Topic {i}", "canonical_name": f"Topic {i}", "category": "Other"}
                    for i in range(BATCH_SIZE)
                ]
            }
        ),
        _mock_response(
            {"topics": [{"name": "Topic Last", "canonical_name": "Topic Last", "category": "Other"}]}
        ),
    ]

    topic_names = [f"Topic {i}" for i in range(BATCH_SIZE)] + ["Topic Last"]
    result = categorize_topics(topic_names, client, "test-model")

    assert len(result) == BATCH_SIZE + 1
    assert client.chat.completions.create.call_count == 2
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scraper && python -m pytest tests/test_categorize_topics.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scraper.categorize_topics'`

- [ ] **Step 3: Create `scraper/scraper/categorize_topics.py`**

```python
import json
import os

CATEGORIES = [
    "Corporate Strategy & Governance",
    "Innovation & Technology",
    "Entrepreneurship & New Ventures",
    "Strategic Leadership & Management",
    "Organizational Behavior & Design",
    "People, Talent & DEI",
    "Decision Making & Behavioral Science",
    "Markets, Competition & Industry",
    "Social Impact & Sustainability",
    "Global Strategy & Emerging Markets",
    "Other",
]

CATEGORIZATION_SYSTEM_PROMPT = (
    "You are organizing a list of academic research topic strings from business "
    "school faculty bios into a fixed taxonomy.\n\n"
    "For each topic string in the input, return an object with:\n"
    '- "name": the original topic string, unchanged (used to match back to the source row)\n'
    '- "canonical_name": a normalized display name. Merge near-duplicate or synonymous '
    'topics (e.g. "Behavior Change" and "Behavioral Change" should both get the same '
    'canonical_name, e.g. "Behavioral Change"). Use title case, prefer the singular form.\n'
    '- "category": exactly one of these categories: ' + ", ".join(CATEGORIES) + ". "
    'Use "Other" only if no other category fits.\n\n'
    'Respond with ONLY a JSON object of the form {"topics": [{"name": "...", '
    '"canonical_name": "...", "category": "..."}, ...]}, with one entry for every input '
    "topic, in the same order as the input."
)

BATCH_SIZE = 50


def categorize_topics(topic_names: list[str], client, model: str) -> list[dict]:
    results: list[dict] = []
    for i in range(0, len(topic_names), BATCH_SIZE):
        batch = topic_names[i : i + BATCH_SIZE]
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": CATEGORIZATION_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps({"topics": batch})},
            ],
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
        results.extend(data["topics"])
    return results


def main() -> None:
    from supabase import create_client

    from scraper.extract import build_client, get_model

    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    result = supabase.table("topics").select("id, name").eq("needs_categorization", True).execute()
    rows = result.data
    if not rows:
        print("No topics need categorization")
        return

    client = build_client()
    model = get_model()
    mapping = categorize_topics([row["name"] for row in rows], client, model)
    by_name = {entry["name"]: entry for entry in mapping}

    updated = 0
    for row in rows:
        entry = by_name.get(row["name"])
        if entry is None:
            continue
        supabase.table("topics").update(
            {
                "canonical_name": entry["canonical_name"],
                "category": entry["category"],
                "needs_categorization": False,
            }
        ).eq("id", row["id"]).execute()
        updated += 1

    print(f"Categorized {updated}/{len(rows)} topics")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scraper && python -m pytest tests/test_categorize_topics.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full scraper test suite**

Run: `cd scraper && python -m pytest`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add scraper/scraper/categorize_topics.py scraper/tests/test_categorize_topics.py
git commit -m "feat(scraper): add LLM-assisted topic categorization script"
```

---

## Task 12: Run categorization against the live database

**Files:** none (operational task)

This task must run **after** Task 1's migration has been applied to the live Supabase project, and after Task 11 is committed.

- [ ] **Step 1: Run the script**

```bash
cd scraper && python -m scraper.categorize_topics
```

Expected output: `Categorized <N>/<N> topics` where N is close to 269 (the current count of rows in `topics`).

- [ ] **Step 2: Spot-check results in Supabase**

Run in the Supabase SQL editor:

```sql
select category, count(*) from topics group by category order by count(*) desc;
```

Expected: ~10 categories from the `CATEGORIES` list (plus possibly `Other`), each with a non-trivial number of topics — no category should be empty and no row should have `category is null` or `needs_categorization = true`.

Spot-check a few `canonical_name` values for obvious near-duplicates (e.g. search for `Behavior` vs `Behavioral`):

```sql
select name, canonical_name, category from topics where name ilike '%behavio%' order by name;
```

If any `canonical_name`/`category` values look clearly wrong, hand-edit them directly in the Supabase table editor — no app code depends on how the values were produced.

- [ ] **Step 3: Rebuild and redeploy the web app**

Since `getAllFaculty()` is queried at build time for SSG, trigger a new Vercel deployment (e.g. `git commit --allow-empty -m "chore: trigger rebuild for topic taxonomy" && git push`, or push the commits from this plan if not already pushed) so the static pages pick up the new `category`/`canonical_name` data.

- [ ] **Step 4: Verify on the live site**

Open `apply-for-strategy.vercel.app`:
- The Topic facet should show ~10 collapsed categories with counts, expandable to specific topics.
- Selecting two topics/categories should narrow to faculty matching both (AND).
- Visit a school page (e.g. `/schools/wharton`) and confirm the portfolio chart shows ~10 category slices instead of hundreds of topic slices.

---

## Self-Review Notes

- **Spec coverage:** AND/intersection (Task 4), scrollable two-level facet (Tasks 9-10), near-duplicate merging via `canonical_name` (Tasks 1, 6, 11-12), category taxonomy (Tasks 1, 4, 11), portfolio chart by category (Task 5). "Research Interests" scraping and visual redesign are explicitly out of scope per the design spec (separate sub-projects).
- **Type consistency:** `Topic { name, category }` (Task 2) is used identically in `sampleData.ts` (Task 3), `filtering.ts`/`getTopicTaxonomy`/`TopicCategoryGroup` (Task 4), `portfolio.ts` (Task 5), `data.ts` (Task 6), `FacultyCard.tsx`/faculty page (Tasks 7-8), and `TopicFacet.tsx` (Task 9).
- **No placeholders:** every step includes full file contents or exact diffs and exact commands.
