# Strategy PhD Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Next.js app with a faceted multi-tag filter UI, faculty/school profile pages, and a per-school research portfolio chart, running against a small hand-written sample dataset.

**Architecture:** Next.js (App Router, TypeScript, Tailwind) in `web/`. All filtering/faceting logic is pure TypeScript functions operating on an in-memory array of `Faculty` objects (no backend calls). Data model and a `supabase/schema.sql` + `seed.sql` are produced as deliverables for Plan B (scraper) to apply against a real Supabase project.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Vitest + React Testing Library + user-event, recharts.

---

## Task 1: Initialize Next.js project and test tooling

**Files:**
- Create: `web/` (via create-next-app)
- Create: `web/vitest.config.ts`
- Create: `web/vitest.setup.ts`
- Modify: `web/package.json`

- [ ] **Step 1: Scaffold the Next.js app**

Run from the repo root:

```bash
npx create-next-app@latest web --typescript --eslint --tailwind --app --no-src-dir --import-alias "@/*" --use-npm
```

If prompted interactively, answer: TypeScript = Yes, ESLint = Yes, Tailwind = Yes, App Router = Yes, no `src/` directory, import alias `@/*`.

- [ ] **Step 2: Install test dependencies**

```bash
cd web && npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Install recharts**

```bash
npm install recharts
```

- [ ] **Step 4: Create `web/vitest.setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Create `web/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

- [ ] **Step 6: Add a test script to `web/package.json`**

In the `"scripts"` section, add:

```json
"test": "vitest run"
```

- [ ] **Step 7: Verify the toolchain with a smoke test**

Create `web/lib/smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('smoke test', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: 1 test file, 1 test passed.

- [ ] **Step 8: Remove the smoke test**

```bash
rm lib/smoke.test.ts
```

- [ ] **Step 9: Commit**

```bash
cd .. && git add web && git commit -m "$(cat <<'EOF'
Scaffold Next.js app with Vitest test setup

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Core types and sample dataset

**Files:**
- Create: `web/lib/types.ts`
- Create: `web/lib/sampleData.ts`

- [ ] **Step 1: Write `web/lib/types.ts`**

```typescript
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

export type Methodology = 'Quantitative' | 'Qualitative' | 'Mixed';

export interface Faculty {
  id: string;
  name: string;
  school: School;
  title: string;
  phd_institution: string;
  photo_url: string | null;
  school_profile_url: string | null;
  personal_website_url: string | null;
  google_scholar_url: string | null;
  methodology: Methodology;
  topics: string[];
  theories: string[];
}
```

- [ ] **Step 2: Write `web/lib/sampleData.ts`**

```typescript
import type { Faculty, School } from './types';

export const schools: School[] = [
  {
    id: 's-wharton',
    name: 'Wharton (UPenn)',
    slug: 'wharton',
    geography: 'Northeast',
    ranking_utd: 3,
    ranking_tamuga: 4,
    ranking_qs: 2,
    ranking_usnews: 1,
    placement_summary: 'Strong placement at top-10 R1 universities.',
    website_url: 'https://www.wharton.upenn.edu',
    logo_url: null,
  },
  {
    id: 's-booth',
    name: 'Chicago Booth',
    slug: 'chicago-booth',
    geography: 'Midwest',
    ranking_utd: 5,
    ranking_tamuga: 3,
    ranking_qs: 5,
    ranking_usnews: 3,
    placement_summary: 'Consistent placement in top economics and strategy departments.',
    website_url: 'https://www.chicagobooth.edu',
    logo_url: null,
  },
  {
    id: 's-ucla',
    name: 'UCLA Anderson',
    slug: 'ucla-anderson',
    geography: 'West Coast',
    ranking_utd: 12,
    ranking_tamuga: 10,
    ranking_qs: 15,
    ranking_usnews: 16,
    placement_summary: 'Strong West Coast placement record.',
    website_url: 'https://www.anderson.ucla.edu',
    logo_url: null,
  },
];

const [wharton, booth, ucla] = schools;

export const allFaculty: Faculty[] = [
  { id: 'f1', name: 'Jane Doe', school: wharton, title: 'Assistant Professor', phd_institution: 'MIT', photo_url: null, school_profile_url: 'https://www.wharton.upenn.edu/faculty/jane-doe', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: ['Innovation', 'Corporate Strategy'], theories: ['RBV'] },
  { id: 'f2', name: 'Robert Chen', school: wharton, title: 'Associate Professor', phd_institution: 'Stanford', photo_url: null, school_profile_url: 'https://www.wharton.upenn.edu/faculty/robert-chen', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: ['M&A', 'Corporate Strategy'], theories: ['Agency Theory'] },
  { id: 'f3', name: 'Maria Garcia', school: wharton, title: 'Professor', phd_institution: 'Harvard', photo_url: null, school_profile_url: 'https://www.wharton.upenn.edu/faculty/maria-garcia', personal_website_url: null, google_scholar_url: null, methodology: 'Mixed', topics: ['Entrepreneurship', 'Innovation'], theories: ['RBV', 'Behavioral Theory'] },
  { id: 'f4', name: 'David Kim', school: wharton, title: 'Assistant Professor', phd_institution: 'UC Berkeley', photo_url: null, school_profile_url: 'https://www.wharton.upenn.edu/faculty/david-kim', personal_website_url: null, google_scholar_url: null, methodology: 'Qualitative', topics: ['Org Theory'], theories: ['Institutional Theory'] },
  { id: 'f5', name: 'Sarah Lee', school: wharton, title: 'Associate Professor', phd_institution: 'Columbia', photo_url: null, school_profile_url: 'https://www.wharton.upenn.edu/faculty/sarah-lee', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: ['Innovation'], theories: ['RBV'] },

  { id: 'f6', name: 'Michael Brown', school: booth, title: 'Professor', phd_institution: 'University of Chicago', photo_url: null, school_profile_url: 'https://www.chicagobooth.edu/faculty/michael-brown', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: ['M&A', 'Corporate Strategy'], theories: ['Agency Theory', 'RBV'] },
  { id: 'f7', name: 'Emily Wilson', school: booth, title: 'Assistant Professor', phd_institution: 'Northwestern', photo_url: null, school_profile_url: 'https://www.chicagobooth.edu/faculty/emily-wilson', personal_website_url: null, google_scholar_url: null, methodology: 'Mixed', topics: ['Entrepreneurship'], theories: ['Behavioral Theory'] },
  { id: 'f8', name: 'James Taylor', school: booth, title: 'Associate Professor', phd_institution: 'Wharton', photo_url: null, school_profile_url: 'https://www.chicagobooth.edu/faculty/james-taylor', personal_website_url: null, google_scholar_url: null, methodology: 'Qualitative', topics: ['Org Theory', 'Corporate Strategy'], theories: ['Institutional Theory'] },
  { id: 'f9', name: 'Linda Martinez', school: booth, title: 'Professor', phd_institution: 'Stanford', photo_url: null, school_profile_url: 'https://www.chicagobooth.edu/faculty/linda-martinez', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: ['Innovation', 'Entrepreneurship'], theories: ['RBV'] },
  { id: 'f10', name: 'Kevin Anderson', school: booth, title: 'Assistant Professor', phd_institution: 'MIT', photo_url: null, school_profile_url: 'https://www.chicagobooth.edu/faculty/kevin-anderson', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: ['M&A'], theories: ['Agency Theory'] },

  { id: 'f11', name: 'Anna Thompson', school: ucla, title: 'Associate Professor', phd_institution: 'UC Berkeley', photo_url: null, school_profile_url: 'https://www.anderson.ucla.edu/faculty/anna-thompson', personal_website_url: null, google_scholar_url: null, methodology: 'Mixed', topics: ['Innovation', 'Org Theory'], theories: ['Institutional Theory', 'RBV'] },
  { id: 'f12', name: 'Brian White', school: ucla, title: 'Professor', phd_institution: 'UCLA', photo_url: null, school_profile_url: 'https://www.anderson.ucla.edu/faculty/brian-white', personal_website_url: null, google_scholar_url: null, methodology: 'Qualitative', topics: ['Entrepreneurship', 'Corporate Strategy'], theories: ['Behavioral Theory'] },
  { id: 'f13', name: 'Catherine Harris', school: ucla, title: 'Assistant Professor', phd_institution: 'Yale', photo_url: null, school_profile_url: 'https://www.anderson.ucla.edu/faculty/catherine-harris', personal_website_url: null, google_scholar_url: null, methodology: 'Quantitative', topics: ['M&A', 'Innovation'], theories: ['Agency Theory'] },
  { id: 'f14', name: 'Daniel Clark', school: ucla, title: 'Associate Professor', phd_institution: 'Duke', photo_url: null, school_profile_url: 'https://www.anderson.ucla.edu/faculty/daniel-clark', personal_website_url: null, google_scholar_url: null, methodology: 'Qualitative', topics: ['Org Theory'], theories: ['Institutional Theory'] },
  { id: 'f15', name: 'Rachel Lewis', school: ucla, title: 'Professor', phd_institution: 'Cornell', photo_url: null, school_profile_url: 'https://www.anderson.ucla.edu/faculty/rachel-lewis', personal_website_url: null, google_scholar_url: null, methodology: 'Mixed', topics: ['Corporate Strategy', 'Innovation'], theories: ['RBV', 'Agency Theory'] },
];
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/types.ts web/lib/sampleData.ts
git commit -m "$(cat <<'EOF'
Add core types and sample faculty/school dataset

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Faceted filtering logic (TDD)

**Files:**
- Create: `web/lib/filtering.ts`
- Test: `web/lib/filtering.test.ts`

- [ ] **Step 1: Write the failing tests in `web/lib/filtering.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { applyFilters, getFacetCounts, EMPTY_FILTERS } from './filtering';
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

const faculty: Faculty[] = [
  makeFaculty({ id: 'f1', name: 'Alice', school: schoolA, topics: ['Innovation'], theories: ['RBV'], methodology: 'Quantitative' }),
  makeFaculty({ id: 'f2', name: 'Bob', school: schoolA, topics: ['M&A'], theories: ['Agency Theory'], methodology: 'Qualitative' }),
  makeFaculty({ id: 'f3', name: 'Carol', school: schoolB, topics: ['Innovation', 'M&A'], theories: ['RBV'], methodology: 'Mixed' }),
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

  it('treats multiple values within the same facet as OR logic', () => {
    const result = applyFilters(faculty, { ...EMPTY_FILTERS, topics: ['Innovation', 'M&A'] });
    expect(result.map((f) => f.id)).toEqual(['f1', 'f2', 'f3']);
  });

  it('filters by geography derived from the faculty school', () => {
    const result = applyFilters(faculty, { ...EMPTY_FILTERS, geography: ['Midwest'] });
    expect(result.map((f) => f.id)).toEqual(['f3']);
  });
});

describe('getFacetCounts', () => {
  it("counts values for a facet ignoring that facet's own active filters", () => {
    const counts = getFacetCounts(faculty, { ...EMPTY_FILTERS, topics: ['Innovation'] }, 'topics');
    expect(counts).toEqual({ Innovation: 2, 'M&A': 2 });
  });

  it('respects filters from other facets when counting', () => {
    const counts = getFacetCounts(faculty, { ...EMPTY_FILTERS, methodology: ['Mixed'] }, 'topics');
    expect(counts).toEqual({ Innovation: 1, 'M&A': 1 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- filtering`
Expected: FAIL — `./filtering` module not found.

- [ ] **Step 3: Write `web/lib/filtering.ts`**

```typescript
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

const ALL_FIELDS: FacetField[] = ['topics', 'theories', 'methodology', 'geography'];

export function valuesForField(faculty: Faculty, field: FacetField): string[] {
  switch (field) {
    case 'topics':
      return faculty.topics;
    case 'theories':
      return faculty.theories;
    case 'methodology':
      return [faculty.methodology];
    case 'geography':
      return [faculty.school.geography];
  }
}

function matchesField(faculty: Faculty, field: FacetField, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const values = valuesForField(faculty, field);
  return selected.some((v) => values.includes(v));
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- filtering`
Expected: PASS — 7 tests passed.

- [ ] **Step 5: Commit**

```bash
git add web/lib/filtering.ts web/lib/filtering.test.ts
git commit -m "$(cat <<'EOF'
Add faceted filtering logic with cross-facet live counts

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Topic distribution logic for portfolio chart (TDD)

**Files:**
- Create: `web/lib/portfolio.ts`
- Test: `web/lib/portfolio.test.ts`

- [ ] **Step 1: Write the failing tests in `web/lib/portfolio.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { getTopicDistribution } from './portfolio';
import type { Faculty } from './types';

function makeFaculty(topics: string[]): Faculty {
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

  it('counts topic mentions across faculty and sorts by count descending', () => {
    const faculty = [
      makeFaculty(['Innovation', 'Corporate Strategy']),
      makeFaculty(['M&A', 'Corporate Strategy']),
      makeFaculty(['Innovation']),
    ];
    expect(getTopicDistribution(faculty)).toEqual([
      { topic: 'Innovation', count: 2, percentage: 40 },
      { topic: 'Corporate Strategy', count: 2, percentage: 40 },
      { topic: 'M&A', count: 1, percentage: 20 },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- portfolio`
Expected: FAIL — `./portfolio` module not found.

- [ ] **Step 3: Write `web/lib/portfolio.ts`**

```typescript
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
      counts[topic] = (counts[topic] ?? 0) + 1;
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- portfolio`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add web/lib/portfolio.ts web/lib/portfolio.test.ts
git commit -m "$(cat <<'EOF'
Add topic distribution logic for school portfolio chart

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: FacetColumn component (TDD)

**Files:**
- Create: `web/components/FacetColumn.tsx`
- Test: `web/components/FacetColumn.test.tsx`

- [ ] **Step 1: Write the failing tests in `web/components/FacetColumn.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacetColumn } from './FacetColumn';

describe('FacetColumn', () => {
  it('renders options with counts and reflects selection state', () => {
    render(
      <FacetColumn
        title="Topic"
        options={['Innovation', 'M&A']}
        counts={{ Innovation: 3, 'M&A': 1 }}
        selected={['Innovation']}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText('Topic')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Innovation/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /M&A/ })).not.toBeChecked();
  });

  it('calls onToggle with the clicked option value', async () => {
    const onToggle = vi.fn();
    render(
      <FacetColumn
        title="Topic"
        options={['Innovation', 'M&A']}
        counts={{ Innovation: 3, 'M&A': 1 }}
        selected={[]}
        onToggle={onToggle}
      />
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /M&A/ }));
    expect(onToggle).toHaveBeenCalledWith('M&A');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- FacetColumn`
Expected: FAIL — `./FacetColumn` module not found.

- [ ] **Step 3: Write `web/components/FacetColumn.tsx`**

```typescript
'use client';

interface FacetColumnProps {
  title: string;
  options: string[];
  counts: Record<string, number>;
  selected: string[];
  onToggle: (value: string) => void;
}

export function FacetColumn({ title, options, counts, selected, onToggle }: FacetColumnProps) {
  return (
    <div className="flex-1 min-w-[160px]">
      <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">{title}</h3>
      <ul className="space-y-1">
        {options.map((option) => (
          <li key={option}>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => onToggle(option)}
              />
              <span>{option}</span>
              <span className="text-gray-400">({counts[option] ?? 0})</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- FacetColumn`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add web/components/FacetColumn.tsx web/components/FacetColumn.test.tsx
git commit -m "$(cat <<'EOF'
Add FacetColumn component for faceted filter UI

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: FacetBar component

**Files:**
- Create: `web/components/FacetBar.tsx`
- Test: `web/components/FacetBar.test.tsx`

- [ ] **Step 1: Write the failing test in `web/components/FacetBar.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacetBar } from './FacetBar';
import { EMPTY_FILTERS } from '@/lib/filtering';

describe('FacetBar', () => {
  it('renders one column per facet definition', () => {
    render(
      <FacetBar
        facetDefinitions={[
          { field: 'topics', title: 'Topic', options: ['Innovation'] },
          { field: 'theories', title: 'Theory', options: ['RBV'] },
        ]}
        filters={EMPTY_FILTERS}
        counts={{ topics: { Innovation: 1 }, theories: { RBV: 1 }, methodology: {}, geography: {} }}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText('Topic')).toBeInTheDocument();
    expect(screen.getByText('Theory')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Innovation/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /RBV/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- FacetBar`
Expected: FAIL — `./FacetBar` module not found.

- [ ] **Step 3: Write `web/components/FacetBar.tsx`**

```typescript
import { FacetColumn } from './FacetColumn';
import type { FacetField, FacetFilters } from '@/lib/filtering';

interface FacetDefinition {
  field: FacetField;
  title: string;
  options: string[];
}

interface FacetBarProps {
  facetDefinitions: FacetDefinition[];
  filters: FacetFilters;
  counts: Record<FacetField, Record<string, number>>;
  onToggle: (field: FacetField, value: string) => void;
}

export function FacetBar({ facetDefinitions, filters, counts, onToggle }: FacetBarProps) {
  return (
    <div className="flex flex-wrap gap-6 border-b pb-4 mb-4">
      {facetDefinitions.map((def) => (
        <FacetColumn
          key={def.field}
          title={def.title}
          options={def.options}
          counts={counts[def.field]}
          selected={filters[def.field]}
          onToggle={(value) => onToggle(def.field, value)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- FacetBar`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add web/components/FacetBar.tsx web/components/FacetBar.test.tsx
git commit -m "$(cat <<'EOF'
Add FacetBar component to lay out facet columns side by side

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: FacultyCard and ResultsList components (TDD)

**Files:**
- Create: `web/components/FacultyCard.tsx`
- Test: `web/components/FacultyCard.test.tsx`
- Create: `web/components/ResultsList.tsx`
- Test: `web/components/ResultsList.test.tsx`

- [ ] **Step 1: Write the failing test in `web/components/FacultyCard.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacultyCard } from './FacultyCard';
import { allFaculty } from '@/lib/sampleData';

describe('FacultyCard', () => {
  it('renders faculty name, school, title, and topic/theory tags', () => {
    const faculty = allFaculty[0];
    render(<FacultyCard faculty={faculty} />);
    expect(screen.getByText(faculty.name)).toBeInTheDocument();
    expect(screen.getByText(faculty.school.name)).toBeInTheDocument();
    expect(screen.getByText(faculty.title)).toBeInTheDocument();
    for (const topic of faculty.topics) {
      expect(screen.getByText(topic)).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- FacultyCard`
Expected: FAIL — `./FacultyCard` module not found.

- [ ] **Step 3: Write `web/components/FacultyCard.tsx`**

```typescript
import Link from 'next/link';
import type { Faculty } from '@/lib/types';

export function FacultyCard({ faculty }: { faculty: Faculty }) {
  return (
    <div className="border rounded p-3 flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        <Link href={`/schools/${faculty.school.slug}`} className="font-medium text-blue-600 hover:underline">
          {faculty.school.name}
        </Link>
        <span>—</span>
        <Link href={`/faculty/${faculty.id}`} className="hover:underline">
          {faculty.name}
        </Link>
        <span className="text-gray-500 text-sm">{faculty.title}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {[...faculty.topics, ...faculty.theories].map((tag) => (
          <span key={tag} className="text-xs bg-gray-100 rounded px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- FacultyCard`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Write the failing test in `web/components/ResultsList.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsList } from './ResultsList';
import { allFaculty } from '@/lib/sampleData';

describe('ResultsList', () => {
  it('shows a result count and renders faculty sorted alphabetically by name', () => {
    const subset = [allFaculty[1], allFaculty[0]]; // Robert Chen, Jane Doe
    render(<ResultsList faculty={subset} />);
    expect(screen.getByText('2 results')).toBeInTheDocument();
    const names = screen.getAllByText(/^(Jane Doe|Robert Chen)$/).map((el) => el.textContent);
    expect(names).toEqual(['Jane Doe', 'Robert Chen']);
  });

  it('uses singular "result" for exactly one match', () => {
    render(<ResultsList faculty={[allFaculty[0]]} />);
    expect(screen.getByText('1 result')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- ResultsList`
Expected: FAIL — `./ResultsList` module not found.

- [ ] **Step 7: Write `web/components/ResultsList.tsx`**

```typescript
import type { Faculty } from '@/lib/types';
import { FacultyCard } from './FacultyCard';

export function ResultsList({ faculty }: { faculty: Faculty[] }) {
  const sorted = [...faculty].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">
        {sorted.length} result{sorted.length === 1 ? '' : 's'}
      </p>
      <div className="flex flex-col gap-2">
        {sorted.map((f) => (
          <FacultyCard key={f.id} faculty={f} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test -- ResultsList`
Expected: PASS — 2 tests passed.

- [ ] **Step 9: Commit**

```bash
git add web/components/FacultyCard.tsx web/components/FacultyCard.test.tsx web/components/ResultsList.tsx web/components/ResultsList.test.tsx
git commit -m "$(cat <<'EOF'
Add FacultyCard and ResultsList components

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: FilterableFacultyList component and home page

**Files:**
- Create: `web/components/FilterableFacultyList.tsx`
- Test: `web/components/FilterableFacultyList.test.tsx`
- Modify: `web/app/page.tsx`

- [ ] **Step 1: Write the failing tests in `web/components/FilterableFacultyList.test.tsx`**

```typescript
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

  it('narrows results when a topic facet is selected', async () => {
    render(<FilterableFacultyList faculty={allFaculty} />);
    const innovationCount = allFaculty.filter((f) => f.topics.includes('Innovation')).length;
    await userEvent.click(screen.getByRole('checkbox', { name: /Innovation/i }));
    expect(screen.getByText(`${innovationCount} results`)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- FilterableFacultyList`
Expected: FAIL — `./FilterableFacultyList` module not found.

- [ ] **Step 3: Write `web/components/FilterableFacultyList.tsx`**

```typescript
'use client';

import { useMemo, useState } from 'react';
import type { Faculty } from '@/lib/types';
import {
  applyFilters,
  getFacetCounts,
  valuesForField,
  EMPTY_FILTERS,
  type FacetField,
  type FacetFilters,
} from '@/lib/filtering';
import { FacetBar } from './FacetBar';
import { ResultsList } from './ResultsList';

const FACET_DEFS: { field: FacetField; title: string }[] = [
  { field: 'topics', title: 'Topic' },
  { field: 'theories', title: 'Theory' },
  { field: 'methodology', title: 'Methodology' },
  { field: 'geography', title: 'Geography' },
];

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

  const counts = useMemo(() => {
    const result = {} as Record<FacetField, Record<string, number>>;
    for (const def of FACET_DEFS) {
      result[def.field] = getFacetCounts(faculty, filters, def.field);
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
      <FacetBar
        facetDefinitions={facetDefinitions}
        filters={filters}
        counts={counts}
        onToggle={handleToggle}
      />
      <ResultsList faculty={filtered} />
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- FilterableFacultyList`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Wire it into `web/app/page.tsx`**

Replace the contents of `web/app/page.tsx` with:

```typescript
import { FilterableFacultyList } from '@/components/FilterableFacultyList';
import { allFaculty } from '@/lib/sampleData';

export default function HomePage() {
  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Strategy PhD Faculty Finder</h1>
      <FilterableFacultyList faculty={allFaculty} />
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add web/components/FilterableFacultyList.tsx web/components/FilterableFacultyList.test.tsx web/app/page.tsx
git commit -m "$(cat <<'EOF'
Wire faceted filtering into the home page

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: PortfolioChart component (TDD)

**Files:**
- Create: `web/components/PortfolioChart.tsx`
- Test: `web/components/PortfolioChart.test.tsx`

- [ ] **Step 1: Write the failing tests in `web/components/PortfolioChart.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortfolioChart } from './PortfolioChart';

describe('PortfolioChart', () => {
  it('shows a message when there is no data', () => {
    render(<PortfolioChart data={[]} />);
    expect(screen.getByText('No topic data available.')).toBeInTheDocument();
  });

  it('renders an svg pie chart when data is present', () => {
    const { container } = render(
      <PortfolioChart
        data={[
          { topic: 'Innovation', count: 3, percentage: 60 },
          { topic: 'M&A', count: 2, percentage: 40 },
        ]}
      />
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- PortfolioChart`
Expected: FAIL — `./PortfolioChart` module not found.

- [ ] **Step 3: Write `web/components/PortfolioChart.tsx`**

```typescript
'use client';

import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import type { TopicDistributionEntry } from '@/lib/portfolio';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777'];

export function PortfolioChart({ data }: { data: TopicDistributionEntry[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No topic data available.</p>;
  }
  return (
    <PieChart width={400} height={300}>
      <Pie
        data={data}
        dataKey="count"
        nameKey="topic"
        innerRadius={60}
        outerRadius={100}
        label={(entry) => `${entry.topic} (${entry.percentage}%)`}
      >
        {data.map((entry, index) => (
          <Cell key={entry.topic} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- PortfolioChart`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add web/components/PortfolioChart.tsx web/components/PortfolioChart.test.tsx
git commit -m "$(cat <<'EOF'
Add PortfolioChart donut chart component

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: School profile page

**Files:**
- Create: `web/app/schools/[slug]/page.tsx`

- [ ] **Step 1: Write `web/app/schools/[slug]/page.tsx`**

```typescript
import { notFound } from 'next/navigation';
import { allFaculty, schools } from '@/lib/sampleData';
import { getTopicDistribution } from '@/lib/portfolio';
import { PortfolioChart } from '@/components/PortfolioChart';
import { ResultsList } from '@/components/ResultsList';

export function generateStaticParams() {
  return schools.map((school) => ({ slug: school.slug }));
}

export default function SchoolPage({ params }: { params: { slug: string } }) {
  const school = schools.find((s) => s.slug === params.slug);
  if (!school) {
    notFound();
  }

  const facultyAtSchool = allFaculty.filter((f) => f.school.slug === school.slug);
  const distribution = getTopicDistribution(facultyAtSchool);

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">{school.name}</h1>
      <p className="text-gray-500 mb-6">{school.geography}</p>

      <h2 className="text-lg font-semibold mb-2">Research Portfolio</h2>
      <PortfolioChart data={distribution} />

      <h2 className="text-lg font-semibold mt-6 mb-2">Faculty</h2>
      <ResultsList faculty={facultyAtSchool} />
    </main>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no type errors, and `/schools/wharton`, `/schools/chicago-booth`, `/schools/ucla-anderson` are listed among generated static routes.

- [ ] **Step 3: Commit**

```bash
git add web/app/schools
git commit -m "$(cat <<'EOF'
Add school profile page with research portfolio chart

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Faculty profile page

**Files:**
- Create: `web/app/faculty/[id]/page.tsx`

- [ ] **Step 1: Write `web/app/faculty/[id]/page.tsx`**

```typescript
import { notFound } from 'next/navigation';
import { allFaculty } from '@/lib/sampleData';

export function generateStaticParams() {
  return allFaculty.map((f) => ({ id: f.id }));
}

export default function FacultyPage({ params }: { params: { id: string } }) {
  const faculty = allFaculty.find((f) => f.id === params.id);
  if (!faculty) {
    notFound();
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">{faculty.name}</h1>
      <p className="text-gray-500 mb-4">
        {faculty.title} — {faculty.school.name}
      </p>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="font-semibold">PhD Institution</dt>
          <dd>{faculty.phd_institution}</dd>
        </div>
        <div>
          <dt className="font-semibold">Methodology</dt>
          <dd>{faculty.methodology}</dd>
        </div>
        <div>
          <dt className="font-semibold">Research Topics</dt>
          <dd>{faculty.topics.join(', ')}</dd>
        </div>
        <div>
          <dt className="font-semibold">Theories</dt>
          <dd>{faculty.theories.join(', ')}</dd>
        </div>
      </dl>
      <div className="flex gap-4 mt-4 text-sm">
        {faculty.school_profile_url && (
          <a className="text-blue-600 underline" href={faculty.school_profile_url}>
            School Profile
          </a>
        )}
        {faculty.personal_website_url && (
          <a className="text-blue-600 underline" href={faculty.personal_website_url}>
            Personal Website
          </a>
        )}
        {faculty.google_scholar_url && (
          <a className="text-blue-600 underline" href={faculty.google_scholar_url}>
            Google Scholar
          </a>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds, with 15 static `/faculty/[id]` routes generated (`f1` through `f15`).

- [ ] **Step 3: Commit**

```bash
git add web/app/faculty
git commit -m "$(cat <<'EOF'
Add faculty profile page

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Supabase schema and seed SQL (deliverable for Plan B)

**Files:**
- Create: `supabase/schema.sql`
- Create: `supabase/seed.sql`

- [ ] **Step 1: Write `supabase/schema.sql`**

```sql
create extension if not exists "uuid-ossp";

create table schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  geography text,
  ranking_utd integer,
  ranking_tamuga integer,
  ranking_qs integer,
  ranking_usnews integer,
  placement_summary text,
  website_url text,
  logo_url text
);

create table topics (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique
);

create table theories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique
);

create table faculty (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  school_id uuid not null references schools(id) on delete cascade,
  title text,
  phd_institution text,
  photo_url text,
  school_profile_url text,
  personal_website_url text,
  google_scholar_url text,
  methodology text,
  needs_review boolean not null default false
);

create table faculty_topics (
  faculty_id uuid not null references faculty(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (faculty_id, topic_id)
);

create table faculty_theories (
  faculty_id uuid not null references faculty(id) on delete cascade,
  theory_id uuid not null references theories(id) on delete cascade,
  primary key (faculty_id, theory_id)
);

create table publications (
  id uuid primary key default uuid_generate_v4(),
  faculty_id uuid not null references faculty(id) on delete cascade,
  title text not null,
  year integer,
  journal text,
  citation_count integer,
  coauthors text[]
);
```

- [ ] **Step 2: Write `supabase/seed.sql`**

```sql
insert into schools (name, slug, geography, ranking_utd, ranking_tamuga, ranking_qs, ranking_usnews, placement_summary, website_url) values
('Wharton (UPenn)', 'wharton', 'Northeast', 3, 4, 2, 1, 'Strong placement at top-10 R1 universities.', 'https://www.wharton.upenn.edu'),
('Chicago Booth', 'chicago-booth', 'Midwest', 5, 3, 5, 3, 'Consistent placement in top economics and strategy departments.', 'https://www.chicagobooth.edu'),
('UCLA Anderson', 'ucla-anderson', 'West Coast', 12, 10, 15, 16, 'Strong West Coast placement record.', 'https://www.anderson.ucla.edu');

insert into topics (name) values
('Innovation'), ('M&A'), ('Corporate Strategy'), ('Entrepreneurship'), ('Org Theory');

insert into theories (name) values
('RBV'), ('Institutional Theory'), ('Behavioral Theory'), ('Agency Theory');

insert into faculty (name, school_id, title, phd_institution, methodology) values
('Jane Doe', (select id from schools where slug = 'wharton'), 'Assistant Professor', 'MIT', 'Quantitative'),
('Robert Chen', (select id from schools where slug = 'wharton'), 'Associate Professor', 'Stanford', 'Quantitative'),
('Maria Garcia', (select id from schools where slug = 'wharton'), 'Professor', 'Harvard', 'Mixed'),
('David Kim', (select id from schools where slug = 'wharton'), 'Assistant Professor', 'UC Berkeley', 'Qualitative'),
('Sarah Lee', (select id from schools where slug = 'wharton'), 'Associate Professor', 'Columbia', 'Quantitative'),
('Michael Brown', (select id from schools where slug = 'chicago-booth'), 'Professor', 'University of Chicago', 'Quantitative'),
('Emily Wilson', (select id from schools where slug = 'chicago-booth'), 'Assistant Professor', 'Northwestern', 'Mixed'),
('James Taylor', (select id from schools where slug = 'chicago-booth'), 'Associate Professor', 'Wharton', 'Qualitative'),
('Linda Martinez', (select id from schools where slug = 'chicago-booth'), 'Professor', 'Stanford', 'Quantitative'),
('Kevin Anderson', (select id from schools where slug = 'chicago-booth'), 'Assistant Professor', 'MIT', 'Quantitative'),
('Anna Thompson', (select id from schools where slug = 'ucla-anderson'), 'Associate Professor', 'UC Berkeley', 'Mixed'),
('Brian White', (select id from schools where slug = 'ucla-anderson'), 'Professor', 'UCLA', 'Qualitative'),
('Catherine Harris', (select id from schools where slug = 'ucla-anderson'), 'Assistant Professor', 'Yale', 'Quantitative'),
('Daniel Clark', (select id from schools where slug = 'ucla-anderson'), 'Associate Professor', 'Duke', 'Qualitative'),
('Rachel Lewis', (select id from schools where slug = 'ucla-anderson'), 'Professor', 'Cornell', 'Mixed');

insert into faculty_topics (faculty_id, topic_id)
select f.id, t.id from faculty f, topics t where
  (f.name = 'Jane Doe' and t.name in ('Innovation', 'Corporate Strategy')) or
  (f.name = 'Robert Chen' and t.name in ('M&A', 'Corporate Strategy')) or
  (f.name = 'Maria Garcia' and t.name in ('Entrepreneurship', 'Innovation')) or
  (f.name = 'David Kim' and t.name in ('Org Theory')) or
  (f.name = 'Sarah Lee' and t.name in ('Innovation')) or
  (f.name = 'Michael Brown' and t.name in ('M&A', 'Corporate Strategy')) or
  (f.name = 'Emily Wilson' and t.name in ('Entrepreneurship')) or
  (f.name = 'James Taylor' and t.name in ('Org Theory', 'Corporate Strategy')) or
  (f.name = 'Linda Martinez' and t.name in ('Innovation', 'Entrepreneurship')) or
  (f.name = 'Kevin Anderson' and t.name in ('M&A')) or
  (f.name = 'Anna Thompson' and t.name in ('Innovation', 'Org Theory')) or
  (f.name = 'Brian White' and t.name in ('Entrepreneurship', 'Corporate Strategy')) or
  (f.name = 'Catherine Harris' and t.name in ('M&A', 'Innovation')) or
  (f.name = 'Daniel Clark' and t.name in ('Org Theory')) or
  (f.name = 'Rachel Lewis' and t.name in ('Corporate Strategy', 'Innovation'));

insert into faculty_theories (faculty_id, theory_id)
select f.id, th.id from faculty f, theories th where
  (f.name = 'Jane Doe' and th.name in ('RBV')) or
  (f.name = 'Robert Chen' and th.name in ('Agency Theory')) or
  (f.name = 'Maria Garcia' and th.name in ('RBV', 'Behavioral Theory')) or
  (f.name = 'David Kim' and th.name in ('Institutional Theory')) or
  (f.name = 'Sarah Lee' and th.name in ('RBV')) or
  (f.name = 'Michael Brown' and th.name in ('Agency Theory', 'RBV')) or
  (f.name = 'Emily Wilson' and th.name in ('Behavioral Theory')) or
  (f.name = 'James Taylor' and th.name in ('Institutional Theory')) or
  (f.name = 'Linda Martinez' and th.name in ('RBV')) or
  (f.name = 'Kevin Anderson' and th.name in ('Agency Theory')) or
  (f.name = 'Anna Thompson' and th.name in ('Institutional Theory', 'RBV')) or
  (f.name = 'Brian White' and th.name in ('Behavioral Theory')) or
  (f.name = 'Catherine Harris' and th.name in ('Agency Theory')) or
  (f.name = 'Daniel Clark' and th.name in ('Institutional Theory')) or
  (f.name = 'Rachel Lewis' and th.name in ('RBV', 'Agency Theory'));
```

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql supabase/seed.sql
git commit -m "$(cat <<'EOF'
Add Supabase schema and seed SQL matching the sample dataset

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
cd web && npm test
```

Expected: all test files pass.

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: builds successfully with no type errors.

- [ ] **Step 3: Start the dev server and check pages in a browser**

```bash
npm run dev
```

Visit:
- `http://localhost:3000/` — verify the multi-column facet bar appears, selecting a Topic checkbox narrows the result list and updates counts in other columns
- `http://localhost:3000/schools/wharton` — verify the donut chart renders with Wharton's topic distribution and the faculty list below it
- `http://localhost:3000/faculty/f1` — verify Jane Doe's profile shows her details and links

- [ ] **Step 4: Stop the dev server**

Press `Ctrl+C`.
