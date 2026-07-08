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
    verified: false,
    openalexAuthorId: null,
    publications: [],
    coauthors: [],
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
