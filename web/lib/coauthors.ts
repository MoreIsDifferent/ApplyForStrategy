import type { Coauthor } from './types';

/**
 * Count how often each coauthor name appears across a faculty member's
 * publications and return the most frequent, highest first (ties broken
 * alphabetically). Input items only need a `coauthors` string array.
 */
export function getTopCoauthors(
  publications: { coauthors: string[] | null }[],
  limit = 8
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const pub of publications) {
    for (const name of pub.coauthors ?? []) {
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'en'))
    .slice(0, limit);
}

/**
 * Attach a `facultyId` to each coauthor by exact (case-insensitive) name lookup.
 * Names absent from the index, or mapped to null (ambiguous — shared by 2+
 * faculty), get facultyId null so we never link to the wrong person.
 */
export function linkCoauthors(
  coauthors: { name: string; count: number }[],
  nameIndex: Map<string, string | null>
): Coauthor[] {
  return coauthors.map((c) => ({
    ...c,
    facultyId: nameIndex.get(c.name.toLowerCase()) ?? null,
  }));
}
