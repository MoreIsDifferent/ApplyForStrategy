import type { Faculty } from './types';
import { getTitleCategory } from './title';
import { getRankingValues } from './ranking';

export type FacetField = 'topics' | 'theories' | 'methodology' | 'geography' | 'title' | 'ranking';

export interface FacetFilters {
  topics: string[];
  theories: string[];
  methodology: string[];
  geography: string[];
  title: string[];
  ranking: string[];
}

export const EMPTY_FILTERS: FacetFilters = {
  topics: [],
  theories: [],
  methodology: [],
  geography: [],
  title: [],
  ranking: [],
};

export interface TopicCategoryGroup {
  category: string;
  topics: string[];
}

const ALL_FIELDS: FacetField[] = ['topics', 'theories', 'methodology', 'geography', 'title', 'ranking'];

// Fields where multiple selected values must ALL match (AND/intersection).
// 'ranking' uses OR/union: matching any selected ranking bucket is enough.
const UNION_FIELDS: FacetField[] = ['ranking'];

export function valuesForField(faculty: Faculty, field: FacetField): string[] {
  switch (field) {
    case 'topics': {
      const values = new Set<string>();
      for (const t of faculty.topics) {
        values.add(t.name);
        values.add(t.category);
      }
      return Array.from(values);
    }
    case 'theories':
      return faculty.theories;
    case 'methodology':
      return faculty.methodology ? [faculty.methodology] : [];
    case 'geography':
      return [faculty.school.geography];
    case 'title': {
      const category = getTitleCategory(faculty.title);
      return category ? [category] : [];
    }
    case 'ranking':
      return getRankingValues(faculty.school);
  }
}

function matchesField(faculty: Faculty, field: FacetField, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const values = valuesForField(faculty, field);
  return UNION_FIELDS.includes(field)
    ? selected.some((v) => values.includes(v))
    : selected.every((v) => values.includes(v));
}

export function applyFilters(faculty: Faculty[], filters: FacetFilters): Faculty[] {
  return faculty.filter((f) => ALL_FIELDS.every((field) => matchesField(f, field, filters[field])));
}

export function getFacetCounts(
  faculty: Faculty[],
  filters: FacetFilters,
  field: FacetField
): Record<string, number> {
  const otherFilters: FacetFilters = { ...filters, [field]: [] };
  const filtered = applyFilters(faculty, otherFilters);
  const counts: Record<string, number> = {};
  for (const f of filtered) {
    for (const value of valuesForField(f, field)) {
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }
  return counts;
}

export function getTopicTaxonomy(faculty: Faculty[]): TopicCategoryGroup[] {
  const map = new Map<string, Set<string>>();
  for (const f of faculty) {
    for (const t of f.topics) {
      if (!map.has(t.category)) map.set(t.category, new Set());
      map.get(t.category)!.add(t.name);
    }
  }
  return Array.from(map.entries())
    .map(([category, topics]) => ({ category, topics: Array.from(topics).sort() }))
    .sort((a, b) => {
      if (a.category === 'Other') return 1;
      if (b.category === 'Other') return -1;
      return a.category.localeCompare(b.category);
    });
}
