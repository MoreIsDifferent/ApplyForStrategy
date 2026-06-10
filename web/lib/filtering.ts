import type { Faculty } from './types';

export type FacetField = 'topics' | 'theories' | 'methodology' | 'geography';

export interface FacetFilters {
  topics: string[];
  theories: string[];
  methodology: string[];
  geography: string[];
}

export const EMPTY_FILTERS: FacetFilters = {
  topics: [],
  theories: [],
  methodology: [],
  geography: [],
};

const ALL_FIELDS: FacetField[] = ['topics', 'theories', 'methodology', 'geography'];

export function valuesForField(faculty: Faculty, field: FacetField): string[] {
  switch (field) {
    case 'topics':
      return faculty.topics;
    case 'theories':
      return faculty.theories;
    case 'methodology':
      return [faculty.methodology];
    case 'geography':
      return [faculty.school.geography];
  }
}

function matchesField(faculty: Faculty, field: FacetField, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const values = valuesForField(faculty, field);
  return selected.some((v) => values.includes(v));
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
