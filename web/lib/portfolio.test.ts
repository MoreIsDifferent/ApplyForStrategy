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
