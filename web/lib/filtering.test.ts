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
