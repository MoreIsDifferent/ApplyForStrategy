import { describe, it, expect } from 'vitest';
import { getTopCoauthors } from './coauthors';

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
    expect(getTopCoauthors(pubs, 3)).toHaveLength(3);
  });
});
