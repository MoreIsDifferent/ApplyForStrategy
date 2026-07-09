import type { Coauthor } from './types';

export interface GraphNode {
  name: string;
  facultyId: string | null;
  count: number;
  x: number;
  y: number;
  radius: number;
  strokeWidth: number;
}

export interface GraphLayout {
  size: number;
  center: { x: number; y: number };
  nodes: GraphNode[];
}

const SIZE = 320;
const CENTER = SIZE / 2;
const RING_RADIUS = 120;
const MIN_NODE_RADIUS = 10;
const NODE_RADIUS_RANGE = 12;
const MIN_STROKE = 1;
const STROKE_RANGE = 4;
const CENTER_POINT = { x: CENTER, y: CENTER } as const;

/** Radial ego layout: coauthors evenly around a ring, sized by collaboration count. */
export function coauthorGraphLayout(coauthors: Coauthor[]): GraphLayout {
  const maxCount = Math.max(1, ...coauthors.map((coauthor) => coauthor.count));
  const nodes: GraphNode[] = coauthors.map((coauthor, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / coauthors.length;
    const ratio = coauthor.count / maxCount;
    return {
      name: coauthor.name,
      facultyId: coauthor.facultyId,
      count: coauthor.count,
      x: CENTER + RING_RADIUS * Math.cos(angle),
      y: CENTER + RING_RADIUS * Math.sin(angle),
      radius: MIN_NODE_RADIUS + NODE_RADIUS_RANGE * ratio,
      strokeWidth: MIN_STROKE + STROKE_RANGE * ratio,
    };
  });
  return { size: SIZE, center: CENTER_POINT, nodes };
}
