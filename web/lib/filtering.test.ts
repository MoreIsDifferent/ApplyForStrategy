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

const schoolC: School = {
  id: 's3', name: 'School C', slug: 'school-c', geography: 'West Coast',
  ranking_utd: 150, ranking_tamuga: null, ranking_qs: null, ranking_usnews: null,
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

  it('filters by title category derived from the faculty title', () => {
    const titledFaculty: Faculty[] = [
      makeFaculty({ id: 't1', name: 'Pat', title: 'Assistant Professor of Strategy' }),
      makeFaculty({ id: 't2', name: 'Sam', title: 'Clinical Professor of Management' }),
    ];
    const result = applyFilters(titledFaculty, { ...EMPTY_FILTERS, title: ['Assistant Professor'] });
    expect(result.map((f) => f.id)).toEqual(['t1']);
  });

  it('filters by ranking bucket using union/OR logic across selections', () => {
    const rankedFaculty: Faculty[] = [
      makeFaculty({ id: 'r1', name: 'Pat', school: schoolA }), // UTD/TAMU/QS/US News all rank 1 -> 1-20
      makeFaculty({ id: 'r2', name: 'Sam', school: schoolC }), // UTD rank 150 -> 100-200
    ];
    const result = applyFilters(rankedFaculty, {
      ...EMPTY_FILTERS,
      ranking: ['UTD Top 100:1-20', 'UTD Top 100:100-200'],
    });
    expect(result.map((f) => f.id).sort()).toEqual(['r1', 'r2']);

    const narrowed = applyFilters(rankedFaculty, { ...EMPTY_FILTERS, ranking: ['UTD Top 100:100-200'] });
    expect(narrowed.map((f) => f.id)).toEqual(['r2']);
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
