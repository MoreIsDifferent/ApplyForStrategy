export interface CoauthorCount {
  name: string;
  count: number;
}

/**
 * Count how often each coauthor name appears across a faculty member's
 * publications and return the most frequent, highest first (ties broken
 * alphabetically). Input items only need a `coauthors` string array.
 */
export function getTopCoauthors(
  publications: { coauthors: string[] | null }[],
  limit = 8
): CoauthorCount[] {
  const counts = new Map<string, number>();
  for (const pub of publications) {
    for (const name of pub.coauthors ?? []) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}
