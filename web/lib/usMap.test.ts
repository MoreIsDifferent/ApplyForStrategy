import { describe, it, expect } from 'vitest';
import { getUSStatePaths } from './usMap';

describe('getUSStatePaths', () => {
  it('returns a path for every US state including those used by school lookups', () => {
    const paths = getUSStatePaths();
    const names = paths.map((p) => p.name);

    expect(names).toContain('California');
    expect(names).toContain('Illinois');
    expect(names).toContain('Pennsylvania');
  });

  it('produces a non-empty SVG path string for each state', () => {
    const paths = getUSStatePaths();
    for (const p of paths) {
      expect(p.d.length).toBeGreaterThan(0);
    }
  });
});
