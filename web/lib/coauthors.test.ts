import { describe, it, expect } from 'vitest';
import { getSampleCoauthors } from './coauthors';
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

describe('getSampleCoauthors', () => {
  it('excludes the faculty member themselves', () => {
    const target = makeFaculty({ id: 'f1', name: 'Alice', topics: [INNOVATION] });
    const result = getSampleCoauthors(target, [target]);
    expect(result).toEqual([]);
  });

  it('ranks faculty with shared topics, theories, school, and methodology higher', () => {
    const target = makeFaculty({ id: 'f1', name: 'Alice', school: schoolA, topics: [INNOVATION], theories: ['RBV'], methodology: 'Quantitative' });
    const sameTopicAndSchool = makeFaculty({ id: 'f2', name: 'Bob', school: schoolA, topics: [INNOVATION], theories: ['RBV'], methodology: 'Quantitative' });
    const sameTopicOnly = makeFaculty({ id: 'f3', name: 'Carol', school: schoolB, topics: [INNOVATION], theories: [], methodology: 'Qualitative' });
    const unrelated = makeFaculty({ id: 'f4', name: 'Dave', school: schoolB, topics: [MA], theories: ['Agency Theory'], methodology: 'Mixed' });

    const result = getSampleCoauthors(target, [target, sameTopicAndSchool, sameTopicOnly, unrelated]);
    expect(result.map((f) => f.id)).toEqual(['f2', 'f3']);
  });

  it('caps results at 5 and breaks ties by name', () => {
    const target = makeFaculty({ id: 'f1', name: 'Alice', topics: [INNOVATION] });
    const others = ['Frank', 'Eve', 'Dave', 'Carol', 'Bob', 'Zara'].map((name, i) =>
      makeFaculty({ id: `o${i}`, name, topics: [INNOVATION] })
    );

    const result = getSampleCoauthors(target, [target, ...others]);
    expect(result).toHaveLength(5);
    expect(result.map((f) => f.name)).toEqual(['Bob', 'Carol', 'Dave', 'Eve', 'Frank']);
  });
});
