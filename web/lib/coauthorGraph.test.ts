import { describe, it, expect } from 'vitest';
import { coauthorGraphLayout } from './coauthorGraph';
import type { Coauthor } from './types';

const c = (name: string, count: number, facultyId: string | null = null): Coauthor => ({ name, count, facultyId });

describe('coauthorGraphLayout', () => {
  it('returns no nodes for empty input', () => {
    const layout = coauthorGraphLayout([]);
    expect(layout.nodes).toEqual([]);
    expect(layout.size).toBeGreaterThan(0);
  });

  it('places the first node at the top of the ring', () => {
    const layout = coauthorGraphLayout([c('A', 1)]);
    expect(layout.nodes[0].x).toBeCloseTo(layout.center.x, 5);
    expect(layout.nodes[0].y).toBeLessThan(layout.center.y);
  });

  it('gives every node a distinct position', () => {
    const layout = coauthorGraphLayout([c('A', 1), c('B', 1), c('C', 1)]);
    const keys = layout.nodes.map((n) => `${n.x.toFixed(2)},${n.y.toFixed(2)}`);
    expect(new Set(keys).size).toBe(3);
  });

  it('scales radius and strokeWidth up with count', () => {
    const layout = coauthorGraphLayout([c('Big', 4), c('Small', 1)]);
    expect(layout.nodes[0].radius).toBeGreaterThan(layout.nodes[1].radius);
    expect(layout.nodes[0].strokeWidth).toBeGreaterThan(layout.nodes[1].strokeWidth);
  });

  it('carries name and facultyId through', () => {
    const layout = coauthorGraphLayout([c('Bob', 2, 'f2')]);
    expect(layout.nodes[0]).toMatchObject({ name: 'Bob', facultyId: 'f2', count: 2 });
  });
});
