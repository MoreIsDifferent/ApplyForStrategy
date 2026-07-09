import { describe, it, expect } from 'vitest';
import { getTopCoauthors, linkCoauthors } from './coauthors';

describe('getTopCoauthors', () => {
  it('returns [] when there are no publications', () => {
    expect(getTopCoauthors([])).toEqual([]);
  });

  it('counts coauthor occurrences across publications and sorts by count desc', () => {
    const pubs = [
      { coauthors: ['Alice', 'Bob'] },
      { coauthors: ['Alice', 'Carol'] },
      { coauthors: ['Alice'] },
    ];
    expect(getTopCoauthors(pubs)).toEqual([
      { name: 'Alice', count: 3 },
      { name: 'Bob', count: 1 },
      { name: 'Carol', count: 1 },
    ]);
  });

  it('breaks count ties alphabetically by name', () => {
    const pubs = [{ coauthors: ['Zoe', 'Ann'] }];
    expect(getTopCoauthors(pubs)).toEqual([
      { name: 'Ann', count: 1 },
      { name: 'Zoe', count: 1 },
    ]);
  });

  it('ignores null/empty coauthor arrays', () => {
    const pubs = [{ coauthors: null }, { coauthors: [] }, { coauthors: ['Bob'] }];
    expect(getTopCoauthors(pubs)).toEqual([{ name: 'Bob', count: 1 }]);
  });

  it('caps results at the given limit', () => {
    const pubs = [{ coauthors: ['A', 'B', 'C', 'D', 'E'] }];
    expect(getTopCoauthors(pubs, 3)).toEqual([
      { name: 'A', count: 1 },
      { name: 'B', count: 1 },
      { name: 'C', count: 1 },
    ]);
  });

  it('ignores empty-string coauthor names', () => {
    expect(getTopCoauthors([{ coauthors: ['', 'Bob'] }])).toEqual([{ name: 'Bob', count: 1 }]);
  });
});

describe('linkCoauthors', () => {
  it('sets facultyId to the unique match for an in-network name', () => {
    const index = new Map<string, string | null>([['bob', 'f2']]);
    expect(linkCoauthors([{ name: 'Bob', count: 2 }], index)).toEqual([
      { name: 'Bob', count: 2, facultyId: 'f2' },
    ]);
  });

  it('leaves facultyId null for absent or ambiguous names', () => {
    const index = new Map<string, string | null>([['ann', null]]); // ambiguous
    expect(linkCoauthors([{ name: 'Ann', count: 1 }, { name: 'Zed', count: 1 }], index)).toEqual([
      { name: 'Ann', count: 1, facultyId: null },
      { name: 'Zed', count: 1, facultyId: null },
    ]);
  });

  it('matches case-insensitively', () => {
    const index = new Map<string, string | null>([['bob smith', 'f9']]);
    expect(linkCoauthors([{ name: 'BOB SMITH', count: 1 }], index)[0].facultyId).toBe('f9');
  });
});
