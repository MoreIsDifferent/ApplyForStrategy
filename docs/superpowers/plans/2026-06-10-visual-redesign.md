# Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Strategy PhD Faculty Finder Next.js app (`web/`) with a warm-white/charcoal/soft-blue light theme, Inter font, pill-style facet filters with per-facet color families, and card-based layouts — matching the design language of "Yi's Personal Website" as documented in `docs/superpowers/specs/2026-06-10-visual-redesign-design.md`.

**Architecture:** Add new design tokens (colors + font) to `web/app/globals.css` and swap `next/font/google` from Geist to Inter in `web/app/layout.tsx`. Introduce a small shared helper (`web/lib/facetColors.ts`) that maps a facet's color scheme + selection state to Tailwind classes, used by both `FacetColumn` and `TopicFacet`. Convert all facet checkboxes to pill-style toggle buttons. Restyle `FacultyCard`, `ResultsList`, the homepage, faculty detail page (with photo/initials avatar), school page (rankings + portfolio chart), and `PortfolioChart`'s color palette.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4 (`@theme inline`), Vitest + Testing Library, recharts.

---

### Task 1: Design tokens & Inter font

**Files:**
- Modify: `web/app/globals.css`
- Modify: `web/app/layout.tsx`

- [ ] **Step 1: Replace the theme tokens in `globals.css`**

Replace the entire contents of `web/app/globals.css` with:

```css
@import "tailwindcss";

@theme inline {
  --color-warm-white: #FAFAF8;
  --color-charcoal: #1F2933;
  --color-gray-secondary: #52606D;
  --color-divider: #E6E8EB;
  --color-accent: #4B9CD3;
  --color-accent-soft: #E8F2FB;
  --color-accent-soft-text: #2b6f9e;
  --color-muted: #9AA5B1;

  --color-theory: #95C0A3;
  --color-theory-soft: #E3F0E6;
  --color-theory-soft-text: #3F7A52;

  --color-method: #E3BACF;
  --color-method-text: #7A4259;
  --color-method-soft: #F8EDF2;
  --color-method-soft-text: #9C6F87;

  --color-geo: #B99B99;
  --color-geo-soft: #F2E6E5;
  --color-geo-soft-text: #8C6E6E;

  --font-sans: var(--font-inter), sans-serif;
}

body {
  background: var(--color-warm-white);
  color: var(--color-charcoal);
}
```

- [ ] **Step 2: Swap Geist for Inter in `layout.tsx`**

Replace the full contents of `web/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Strategy PhD Faculty Finder",
  description: "Search and filter Strategy PhD faculty across top US programs by research topic, theory, methodology, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verify the app builds**

Run: `cd web && npx tsc --noEmit`
Expected: No new errors (the pre-existing `FacultyCard.test.tsx` type error, if any, is addressed in Task 7).

- [ ] **Step 4: Commit**

```bash
cd web && git add app/globals.css app/layout.tsx
git commit -m "feat(web): add warm-white design tokens and switch to Inter font"
```

---

### Task 2: Facet color helper

**Files:**
- Create: `web/lib/facetColors.ts`
- Test: `web/lib/facetColors.test.ts`

- [ ] **Step 1: Write the failing test**

Create `web/lib/facetColors.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pillClasses } from './facetColors';

describe('pillClasses', () => {
  it('returns the accent classes for the topic scheme', () => {
    expect(pillClasses('topic', true)).toBe('bg-accent text-white');
    expect(pillClasses('topic', false)).toBe('bg-accent-soft text-accent-soft-text');
  });

  it('returns the theory (green) classes', () => {
    expect(pillClasses('theory', true)).toBe('bg-theory text-white');
    expect(pillClasses('theory', false)).toBe('bg-theory-soft text-theory-soft-text');
  });

  it('returns the methodology (mauve) classes', () => {
    expect(pillClasses('method', true)).toBe('bg-method text-method-text');
    expect(pillClasses('method', false)).toBe('bg-method-soft text-method-soft-text');
  });

  it('returns the geography (rose-brown) classes', () => {
    expect(pillClasses('geo', true)).toBe('bg-geo text-white');
    expect(pillClasses('geo', false)).toBe('bg-geo-soft text-geo-soft-text');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run lib/facetColors.test.ts`
Expected: FAIL with "Failed to resolve import './facetColors'" or "no exported member pillClasses"

- [ ] **Step 3: Implement `facetColors.ts`**

Create `web/lib/facetColors.ts`:

```ts
export type FacetColorScheme = 'topic' | 'theory' | 'method' | 'geo';

const SELECTED: Record<FacetColorScheme, string> = {
  topic: 'bg-accent text-white',
  theory: 'bg-theory text-white',
  method: 'bg-method text-method-text',
  geo: 'bg-geo text-white',
};

const UNSELECTED: Record<FacetColorScheme, string> = {
  topic: 'bg-accent-soft text-accent-soft-text',
  theory: 'bg-theory-soft text-theory-soft-text',
  method: 'bg-method-soft text-method-soft-text',
  geo: 'bg-geo-soft text-geo-soft-text',
};

export function pillClasses(scheme: FacetColorScheme, selected: boolean): string {
  return selected ? SELECTED[scheme] : UNSELECTED[scheme];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npx vitest run lib/facetColors.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
cd web && git add lib/facetColors.ts lib/facetColors.test.ts
git commit -m "feat(web): add facet pill color helper"
```

---

### Task 3: FacetColumn pill restyle

**Files:**
- Modify: `web/components/FacetColumn.tsx`
- Test: `web/components/FacetColumn.test.tsx`

- [ ] **Step 1: Write the failing test**

Replace the full contents of `web/components/FacetColumn.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacetColumn } from './FacetColumn';

describe('FacetColumn', () => {
  it('renders options as pills with counts and reflects selection state', () => {
    render(
      <FacetColumn
        title="Theory"
        options={['Innovation', 'M&A']}
        counts={{ Innovation: 3, 'M&A': 1 }}
        selected={['Innovation']}
        colorScheme="theory"
        onToggle={() => {}}
      />
    );
    expect(screen.getByText('Theory')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Innovation (3)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'M&A (1)' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onToggle with the clicked option value', async () => {
    const onToggle = vi.fn();
    render(
      <FacetColumn
        title="Theory"
        options={['Innovation', 'M&A']}
        counts={{ Innovation: 3, 'M&A': 1 }}
        selected={[]}
        colorScheme="theory"
        onToggle={onToggle}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'M&A (1)' }));
    expect(onToggle).toHaveBeenCalledWith('M&A');
  });

  it('applies the matching color scheme classes for selected and unselected pills', () => {
    render(
      <FacetColumn
        title="Methodology"
        options={['Quantitative', 'Qualitative']}
        counts={{ Quantitative: 2, Qualitative: 1 }}
        selected={['Quantitative']}
        colorScheme="method"
        onToggle={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Quantitative (2)' }).className).toContain('bg-method');
    expect(screen.getByRole('button', { name: 'Qualitative (1)' }).className).toContain('bg-method-soft');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run components/FacetColumn.test.tsx`
Expected: FAIL — `colorScheme` prop not accepted / pills not rendered as buttons (current implementation renders checkboxes)

- [ ] **Step 3: Implement the pill-based `FacetColumn`**

Replace the full contents of `web/components/FacetColumn.tsx` with:

```tsx
'use client';

import { pillClasses, type FacetColorScheme } from '@/lib/facetColors';

interface FacetColumnProps {
  title: string;
  options: string[];
  counts: Record<string, number>;
  selected: string[];
  colorScheme: FacetColorScheme;
  onToggle: (value: string) => void;
}

export function FacetColumn({ title, options, counts, selected, colorScheme, onToggle }: FacetColumnProps) {
  return (
    <div className="flex-1 min-w-[160px]">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-secondary mb-2">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(option)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${pillClasses(colorScheme, isSelected)}`}
            >
              {option} ({counts[option] ?? 0})
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npx vitest run components/FacetColumn.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
cd web && git add components/FacetColumn.tsx components/FacetColumn.test.tsx
git commit -m "feat(web): restyle FacetColumn as color-coded pill toggles"
```

---

### Task 4: TopicFacet pill restyle

**Files:**
- Modify: `web/components/TopicFacet.tsx`
- Test: `web/components/TopicFacet.test.tsx`

- [ ] **Step 1: Write the failing test**

Replace the full contents of `web/components/TopicFacet.test.tsx` with:

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
    expect(screen.getByRole('button', { name: 'Corporate Strategy & Governance (3)' })).toBeInTheDocument();
    expect(screen.queryByText('M&A')).not.toBeInTheDocument();
  });

  it('expands a category to reveal its topics as pills', async () => {
    render(<TopicFacet groups={groups} counts={counts} selected={[]} onToggle={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /Toggle Corporate Strategy & Governance/i }));
    expect(screen.getByRole('button', { name: 'M&A (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Corporate Strategy (2)' })).toBeInTheDocument();
  });

  it('calls onToggle with the category name when its pill is clicked', async () => {
    const onToggle = vi.fn();
    render(<TopicFacet groups={groups} counts={counts} selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Corporate Strategy & Governance (3)' }));
    expect(onToggle).toHaveBeenCalledWith('Corporate Strategy & Governance');
  });

  it('calls onToggle with the topic name when an expanded topic pill is clicked', async () => {
    const onToggle = vi.fn();
    render(<TopicFacet groups={groups} counts={counts} selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /Toggle Corporate Strategy & Governance/i }));
    await userEvent.click(screen.getByRole('button', { name: 'M&A (2)' }));
    expect(onToggle).toHaveBeenCalledWith('M&A');
  });

  it('reflects selection state and color scheme on pills', async () => {
    render(<TopicFacet groups={groups} counts={counts} selected={['Corporate Strategy & Governance']} onToggle={() => {}} />);
    const categoryPill = screen.getByRole('button', { name: 'Corporate Strategy & Governance (3)' });
    expect(categoryPill).toHaveAttribute('aria-pressed', 'true');
    expect(categoryPill.className).toContain('bg-accent');
  });

  it('hides categories with zero count', () => {
    const zeroCounts = { ...counts, 'Innovation & Technology': 0, Innovation: 0 };
    render(<TopicFacet groups={groups} counts={zeroCounts} selected={[]} onToggle={() => {}} />);
    expect(screen.queryByText('Innovation & Technology')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run components/TopicFacet.test.tsx`
Expected: FAIL — categories/topics currently render as checkboxes, not pill buttons named e.g. `'M&A (2)'`

- [ ] **Step 3: Implement the pill-based `TopicFacet`**

Replace the full contents of `web/components/TopicFacet.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import type { TopicCategoryGroup } from '@/lib/filtering';
import { pillClasses } from '@/lib/facetColors';

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
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-secondary mb-2">Topic</h3>
      <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-2">
        {visibleGroups.map((group) => {
          const isCategorySelected = selected.includes(group.category);
          return (
            <div key={group.category}>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-pressed={isCategorySelected}
                  onClick={() => onToggle(group.category)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${pillClasses('topic', isCategorySelected)}`}
                >
                  {group.category} ({group.count})
                </button>
                <button
                  type="button"
                  aria-label={`Toggle ${group.category}`}
                  onClick={() => toggleExpanded(group.category)}
                  className="text-gray-secondary text-xs w-4 text-center"
                >
                  {expanded.has(group.category) ? '▾' : '▸'}
                </button>
              </div>
              {expanded.has(group.category) && (
                <div className="flex flex-wrap gap-1.5 ml-4 mt-1.5">
                  {group.topics.map((topic) => {
                    const isTopicSelected = selected.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        aria-pressed={isTopicSelected}
                        onClick={() => onToggle(topic)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${pillClasses('topic', isTopicSelected)}`}
                      >
                        {topic} ({counts[topic] ?? 0})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npx vitest run components/TopicFacet.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
cd web && git add components/TopicFacet.tsx components/TopicFacet.test.tsx
git commit -m "feat(web): restyle TopicFacet as pill toggles with expand/collapse"
```

---

### Task 5: FacetBar card wrapper + color schemes

**Files:**
- Modify: `web/components/FacetBar.tsx`
- Test: `web/components/FacetBar.test.tsx`

- [ ] **Step 1: Write the failing test**

Replace the full contents of `web/components/FacetBar.test.tsx` with:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacetBar } from './FacetBar';
import { EMPTY_FILTERS } from '@/lib/filtering';

describe('FacetBar', () => {
  it('renders one column per facet definition inside a white card', () => {
    const { container } = render(
      <FacetBar
        facetDefinitions={[
          { field: 'theories', title: 'Theory', options: ['RBV'], colorScheme: 'theory' },
          { field: 'methodology', title: 'Methodology', options: ['Quantitative'], colorScheme: 'method' },
        ]}
        filters={EMPTY_FILTERS}
        counts={{ topics: {}, theories: { RBV: 1 }, methodology: { Quantitative: 1 }, geography: {} }}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText('Theory')).toBeInTheDocument();
    expect(screen.getByText('Methodology')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RBV (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quantitative (1)' })).toBeInTheDocument();
    expect(container.querySelector('.bg-white')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run components/FacetBar.test.tsx`
Expected: FAIL — `colorScheme` not accepted by `FacetDefinition`/`FacetColumn`, and there's no `.bg-white` wrapper

- [ ] **Step 3: Implement the card-wrapped `FacetBar`**

Replace the full contents of `web/components/FacetBar.tsx` with:

```tsx
import { FacetColumn } from './FacetColumn';
import type { FacetColorScheme } from '@/lib/facetColors';
import type { FacetField, FacetFilters } from '@/lib/filtering';

interface FacetDefinition {
  field: FacetField;
  title: string;
  options: string[];
  colorScheme: FacetColorScheme;
}

interface FacetBarProps {
  facetDefinitions: FacetDefinition[];
  filters: FacetFilters;
  counts: Record<FacetField, Record<string, number>>;
  onToggle: (field: FacetField, value: string) => void;
}

export function FacetBar({ facetDefinitions, filters, counts, onToggle }: FacetBarProps) {
  return (
    <div className="bg-white border border-divider rounded-lg p-3 flex flex-wrap gap-4">
      {facetDefinitions.map((def) => (
        <FacetColumn
          key={def.field}
          title={def.title}
          options={def.options}
          counts={counts[def.field]}
          selected={filters[def.field]}
          colorScheme={def.colorScheme}
          onToggle={(value) => onToggle(def.field, value)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npx vitest run components/FacetBar.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
cd web && git add components/FacetBar.tsx components/FacetBar.test.tsx
git commit -m "feat(web): wrap FacetBar columns in a white card with color schemes"
```

---

### Task 6: FilterableFacultyList layout & color scheme wiring

**Files:**
- Modify: `web/components/FilterableFacultyList.tsx`
- Test: `web/components/FilterableFacultyList.test.tsx`

- [ ] **Step 1: Write the failing test**

Replace the full contents of `web/components/FilterableFacultyList.test.tsx` with:

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
    await userEvent.click(screen.getByRole('button', { name: /Innovation & Technology/i }));
    expect(screen.getByText(`${count} results`)).toBeInTheDocument();
  });

  it('narrows results further when a specific topic within an expanded category is selected', async () => {
    render(<FilterableFacultyList faculty={allFaculty} />);
    await userEvent.click(screen.getByRole('button', { name: /Toggle Corporate Strategy & Governance/i }));
    const count = allFaculty.filter((f) => f.topics.some((t) => t.name === 'M&A')).length;
    await userEvent.click(screen.getByRole('button', { name: /^M&A/i }));
    expect(screen.getByText(`${count} results`)).toBeInTheDocument();
  });

  it('narrows results when a methodology facet pill is selected', async () => {
    render(<FilterableFacultyList faculty={allFaculty} />);
    const count = allFaculty.filter((f) => f.methodology === 'Quantitative').length;
    await userEvent.click(screen.getByRole('button', { name: /^Quantitative/i }));
    expect(screen.getByText(`${count} results`)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run components/FilterableFacultyList.test.tsx`
Expected: FAIL — current `FACET_DEFS` has no `colorScheme`, causing a TypeScript error in `FacetBar`/`FacetColumn`, and facets render as checkboxes

- [ ] **Step 3: Update `FilterableFacultyList`**

In `web/components/FilterableFacultyList.tsx`, make these changes:

1. Add the `FacetColorScheme` import and add `colorScheme` to each facet definition:

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
import type { FacetColorScheme } from '@/lib/facetColors';
import { FacetBar } from './FacetBar';
import { TopicFacet } from './TopicFacet';
import { ResultsList } from './ResultsList';

const FACET_DEFS: { field: FacetField; title: string; colorScheme: FacetColorScheme }[] = [
  { field: 'theories', title: 'Theory', colorScheme: 'theory' },
  { field: 'methodology', title: 'Methodology', colorScheme: 'method' },
  { field: 'geography', title: 'Geography', colorScheme: 'geo' },
];
```

2. Replace the final `return` block's filter wrapper `<div className="flex flex-wrap gap-6 border-b pb-4 mb-4">...</div>` with a vertical stack of cards:

```tsx
  return (
    <div>
      <div className="flex flex-col gap-3 mb-6">
        <div className="bg-white border border-divider rounded-lg p-3">
          <TopicFacet
            groups={topicGroups}
            counts={counts.topics}
            selected={filters.topics}
            onToggle={(value) => handleToggle('topics', value)}
          />
        </div>
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
```

The rest of the component (state, `useMemo` blocks, `handleToggle`) stays unchanged.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npx vitest run components/FilterableFacultyList.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
cd web && git add components/FilterableFacultyList.tsx components/FilterableFacultyList.test.tsx
git commit -m "feat(web): wire facet color schemes and restyle filter layout"
```

---

### Task 7: FacultyCard & ResultsList restyle

**Files:**
- Modify: `web/components/FacultyCard.tsx`
- Modify: `web/components/ResultsList.tsx`
- Test: `web/components/FacultyCard.test.tsx`
- Test: `web/components/ResultsList.test.tsx`

- [ ] **Step 1: Write the failing test for FacultyCard**

Replace the full contents of `web/components/FacultyCard.test.tsx` with:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacultyCard } from './FacultyCard';
import { allFaculty } from '@/lib/sampleData';

describe('FacultyCard', () => {
  it('renders faculty name, title/school line, and topic pills', () => {
    const faculty = allFaculty[0];
    render(<FacultyCard faculty={faculty} />);
    expect(screen.getByText(faculty.name)).toBeInTheDocument();
    expect(screen.getByText(`${faculty.title} — ${faculty.school.name}`)).toBeInTheDocument();
    for (const topic of faculty.topics) {
      expect(screen.getByText(topic.name)).toBeInTheDocument();
    }
  });

  it('shows the methodology line when present', () => {
    const faculty = allFaculty[0];
    render(<FacultyCard faculty={faculty} />);
    expect(screen.getByText(`Methodology: ${faculty.methodology}`)).toBeInTheDocument();
  });

  it('links to the faculty detail page', () => {
    const faculty = allFaculty[0];
    render(<FacultyCard faculty={faculty} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', `/faculty/${faculty.id}`);
  });
});
```

- [ ] **Step 2: Run the FacultyCard test to verify it fails**

Run: `cd web && npx vitest run components/FacultyCard.test.tsx`
Expected: FAIL — current markup has two links (school + faculty) and renders title/school separately, not as a single `${title} — ${school.name}` text node

- [ ] **Step 3: Implement the restyled `FacultyCard`**

Replace the full contents of `web/components/FacultyCard.tsx` with:

```tsx
import Link from 'next/link';
import type { Faculty } from '@/lib/types';

export function FacultyCard({ faculty }: { faculty: Faculty }) {
  return (
    <Link
      href={`/faculty/${faculty.id}`}
      className="block bg-white border border-divider rounded-lg p-4 hover:border-accent transition-colors"
    >
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
  );
}
```

- [ ] **Step 4: Run the FacultyCard test to verify it passes**

Run: `cd web && npx vitest run components/FacultyCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Update `ResultsList` spacing**

In `web/components/ResultsList.tsx`, change the result-count text color and card gap. Replace the full contents with:

```tsx
import type { Faculty } from '@/lib/types';
import { FacultyCard } from './FacultyCard';

export function ResultsList({ faculty }: { faculty: Faculty[] }) {
  const sorted = [...faculty].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      <p className="text-sm text-gray-secondary mb-2">
        {sorted.length} result{sorted.length === 1 ? '' : 's'}
      </p>
      <div className="flex flex-col gap-3">
        {sorted.map((f) => (
          <FacultyCard key={f.id} faculty={f} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run the ResultsList test to verify it still passes**

Run: `cd web && npx vitest run components/ResultsList.test.tsx`
Expected: PASS (2 tests, unchanged)

- [ ] **Step 7: Commit**

```bash
cd web && git add components/FacultyCard.tsx components/FacultyCard.test.tsx components/ResultsList.tsx
git commit -m "feat(web): restyle FacultyCard and ResultsList with new palette"
```

---

### Task 8: Homepage header restyle

**Files:**
- Modify: `web/app/page.tsx`

- [ ] **Step 1: Restyle the homepage**

Replace the full contents of `web/app/page.tsx` with:

```tsx
import { FilterableFacultyList } from '@/components/FilterableFacultyList';
import { getAllFaculty } from '@/lib/data';

export default async function HomePage() {
  const allFaculty = await getAllFaculty();
  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-charcoal">Strategy PhD Faculty Finder</h1>
      <p className="text-sm text-gray-secondary mt-1 mb-6">
        Browse strategy faculty across top business schools
      </p>
      <FilterableFacultyList faculty={allFaculty} />
    </main>
  );
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

Run: `cd web && npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
cd web && git add app/page.tsx
git commit -m "feat(web): restyle homepage header"
```

---

### Task 9: Faculty detail page restyle (with photo/initials avatar)

**Files:**
- Create: `web/lib/initials.ts`
- Create: `web/lib/initials.test.ts`
- Modify: `web/app/faculty/[id]/page.tsx`

- [ ] **Step 1: Write the failing test for `getInitials`**

Create `web/lib/initials.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getInitials } from './initials';

describe('getInitials', () => {
  it('returns the first letter of the first two words, uppercased', () => {
    expect(getInitials('Adam Grant')).toBe('AG');
  });

  it('handles a single name', () => {
    expect(getInitials('Madonna')).toBe('M');
  });

  it('ignores extra whitespace between words', () => {
    expect(getInitials('Mary  Jane Watson')).toBe('MJ');
  });

  it('lowercases input names are uppercased in the result', () => {
    expect(getInitials('jane doe')).toBe('JD');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run lib/initials.test.ts`
Expected: FAIL with "Failed to resolve import './initials'"

- [ ] **Step 3: Implement `getInitials`**

Create `web/lib/initials.ts`:

```ts
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npx vitest run lib/initials.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Restyle the faculty detail page**

Replace the full contents of `web/app/faculty/[id]/page.tsx` with:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllFaculty } from '@/lib/data';
import { getInitials } from '@/lib/initials';

export async function generateStaticParams() {
  const allFaculty = await getAllFaculty();
  return allFaculty.map((f) => ({ id: f.id }));
}

export default async function FacultyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const allFaculty = await getAllFaculty();
  const faculty = allFaculty.find((f) => f.id === id);
  if (!faculty) {
    notFound();
  }

  return (
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
            {getInitials(faculty.name)}
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
              {faculty.topics.length > 0 ? (
                faculty.topics.map((t) => (
                  <span key={t.name} className="bg-accent-soft text-accent-soft-text rounded-full px-2.5 py-0.5 text-[11px]">
                    {t.name}
                  </span>
                ))
              ) : (
                <span className="text-charcoal">Unknown</span>
              )}
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
          <a className="text-accent hover:underline" href={faculty.school_profile_url}>
            School Profile
          </a>
        )}
        {faculty.personal_website_url && (
          <a className="text-accent hover:underline" href={faculty.personal_website_url}>
            Personal Website
          </a>
        )}
        {faculty.google_scholar_url && (
          <a className="text-accent hover:underline" href={faculty.google_scholar_url}>
            Google Scholar
          </a>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Run the full test suite and typecheck**

Run: `cd web && npx vitest run && npx tsc --noEmit`
Expected: All vitest tests PASS; `tsc` reports no new errors

- [ ] **Step 7: Commit**

```bash
cd web && git add lib/initials.ts lib/initials.test.ts "app/faculty/[id]/page.tsx"
git commit -m "feat(web): restyle faculty detail page with photo/initials avatar"
```

---

### Task 10: School page restyle (Rankings + Portfolio Chart)

**Files:**
- Modify: `web/app/schools/[slug]/page.tsx`

- [ ] **Step 1: Restyle the school page**

Replace the full contents of `web/app/schools/[slug]/page.tsx` with:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllFaculty, getSchools } from '@/lib/data';
import { getTopicDistribution } from '@/lib/portfolio';
import { PortfolioChart } from '@/components/PortfolioChart';
import { ResultsList } from '@/components/ResultsList';

export async function generateStaticParams() {
  const schools = await getSchools();
  return schools.map((school) => ({ slug: school.slug }));
}

export default async function SchoolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const schools = await getSchools();
  const school = schools.find((s) => s.slug === slug);
  if (!school) {
    notFound();
  }

  const allFaculty = await getAllFaculty();
  const facultyAtSchool = allFaculty.filter((f) => f.school.slug === school.slug);
  const distribution = getTopicDistribution(facultyAtSchool);

  return (
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
  );
}
```

- [ ] **Step 2: Run the full test suite and typecheck**

Run: `cd web && npx vitest run && npx tsc --noEmit`
Expected: All vitest tests PASS; `tsc` reports no new errors

- [ ] **Step 3: Commit**

```bash
cd web && git add "app/schools/[slug]/page.tsx"
git commit -m "feat(web): restyle school page rankings and portfolio sections"
```

---

### Task 11: PortfolioChart color palette

**Files:**
- Modify: `web/components/PortfolioChart.tsx`

- [ ] **Step 1: Update the color array**

In `web/components/PortfolioChart.tsx`, replace line 6:

```ts
const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777'];
```

with:

```ts
const COLORS = ['#4B9CD3', '#7CB9E8', '#2b6f9e', '#9AA5B1', '#A8D5BA', '#E8B86D', '#D88C8C'];
```

- [ ] **Step 2: Run the PortfolioChart test to verify it still passes**

Run: `cd web && npx vitest run components/PortfolioChart.test.tsx`
Expected: PASS (2 tests, unchanged)

- [ ] **Step 3: Run the full suite, typecheck, and build**

Run: `cd web && npx vitest run && npx tsc --noEmit && npm run build`
Expected: All vitest tests PASS; `tsc` reports no new errors; build succeeds (requires `web/.env.local` for Supabase SSG, as in prior sessions)

- [ ] **Step 4: Commit**

```bash
cd web && git add components/PortfolioChart.tsx
git commit -m "feat(web): align PortfolioChart colors with new palette"
```

---

## Self-Review Notes

- **Spec coverage:** Foundation tokens (Task 1), facet pill color system (Tasks 2–6), FacultyCard/ResultsList (Task 7), homepage header (Task 8), faculty detail page incl. `photo_url`/initials fallback (Task 9), school page rankings + portfolio chart (Task 10), PortfolioChart colors (Task 11) — all spec sections covered.
- **Type consistency:** `FacetColorScheme` ('topic' | 'theory' | 'method' | 'geo') defined once in `lib/facetColors.ts` (Task 2) and reused unchanged by `FacetColumn` (Task 3), `TopicFacet` (Task 4, hardcoded `'topic'`), `FacetBar`'s `FacetDefinition` (Task 5), and `FilterableFacultyList`'s `FACET_DEFS` (Task 6).
- **Out of scope confirmed:** no dark mode, no `photo_url` data population, no new facets/fields.
