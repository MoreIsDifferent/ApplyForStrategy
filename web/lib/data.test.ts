import { describe, it, expect } from 'vitest';
import { buildFaculty, type FacultyRow, type PublicationRow } from './data';

const schoolRow = {
  id: 's1', name: 'Test School', slug: 'test-school', geography: 'Northeast',
  ranking_utd: 1, ranking_tamuga: null, ranking_qs: null, ranking_usnews: null,
  placement_summary: null, website_url: null, logo_url: null,
};

function facultyRow(overrides: Partial<FacultyRow>): FacultyRow {
  return {
    id: 'f1', name: 'Alice', title: null, phd_institution: null, photo_url: null,
    school_profile_url: null, personal_website_url: null, google_scholar_url: null,
    methodology: null, openalex_author_id: null, openalex_match_confidence: null,
    schools: schoolRow, faculty_topics: [], faculty_theories: [],
    ...overrides,
  };
}

const pubs: PublicationRow[] = [
  { faculty_id: 'f1', title: 'Paper A', journal: 'AMJ', year: 2020, citation_count: 50, coauthors: ['Bob'] },
  { faculty_id: 'f1', title: 'Paper B', journal: 'SMJ', year: 2019, citation_count: 90, coauthors: ['Bob', 'Carol'] },
];

describe('buildFaculty', () => {
  it('marks name_institution matches verified and attaches publications sorted by citations', () => {
    const f = buildFaculty(
      facultyRow({ openalex_author_id: 'A123', openalex_match_confidence: 'name_institution' }),
      pubs
    );
    expect(f.verified).toBe(true);
    expect(f.openalexAuthorId).toBe('A123');
    expect(f.publications.map((p) => p.title)).toEqual(['Paper B', 'Paper A']);
    expect(f.coauthors).toEqual([{ name: 'Bob', count: 2 }, { name: 'Carol', count: 1 }]);
  });

  it('hides all OpenAlex-derived data for ambiguous (unverified) faculty', () => {
    const f = buildFaculty(
      facultyRow({ openalex_author_id: 'A999', openalex_match_confidence: 'ambiguous' }),
      pubs
    );
    expect(f.verified).toBe(false);
    expect(f.openalexAuthorId).toBeNull();
    expect(f.publications).toEqual([]);
    expect(f.coauthors).toEqual([]);
  });

  it('caps attached publications at 25', () => {
    const many: PublicationRow[] = Array.from({ length: 40 }, (_, i) => ({
      faculty_id: 'f1', title: `P${i}`, journal: null, year: 2000 + i, citation_count: i, coauthors: [],
    }));
    const f = buildFaculty(
      facultyRow({ openalex_author_id: 'A1', openalex_match_confidence: 'name_institution' }),
      many
    );
    expect(f.publications).toHaveLength(25);
    expect(f.publications[0].citation_count).toBe(39);
  });
});
