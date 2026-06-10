'use client';

import { useMemo, useState } from 'react';
import type { Faculty } from '@/lib/types';
import {
  applyFilters,
  getFacetCounts,
  valuesForField,
  EMPTY_FILTERS,
  type FacetField,
  type FacetFilters,
} from '@/lib/filtering';
import { FacetBar } from './FacetBar';
import { ResultsList } from './ResultsList';

const FACET_DEFS: { field: FacetField; title: string }[] = [
  { field: 'topics', title: 'Topic' },
  { field: 'theories', title: 'Theory' },
  { field: 'methodology', title: 'Methodology' },
  { field: 'geography', title: 'Geography' },
];

function uniqueValues(faculty: Faculty[], field: FacetField): string[] {
  const set = new Set<string>();
  for (const f of faculty) {
    valuesForField(f, field).forEach((v) => set.add(v));
  }
  return Array.from(set).sort();
}

export function FilterableFacultyList({ faculty }: { faculty: Faculty[] }) {
  const [filters, setFilters] = useState<FacetFilters>(EMPTY_FILTERS);

  const facetDefinitions = useMemo(
    () =>
      FACET_DEFS.map((def) => ({
        ...def,
        options: uniqueValues(faculty, def.field),
      })),
    [faculty]
  );

  const counts = useMemo(() => {
    const result = {} as Record<FacetField, Record<string, number>>;
    for (const def of FACET_DEFS) {
      result[def.field] = getFacetCounts(faculty, filters, def.field);
    }
    return result;
  }, [faculty, filters]);

  const filtered = useMemo(() => applyFilters(faculty, filters), [faculty, filters]);

  function handleToggle(field: FacetField, value: string) {
    setFilters((prev) => {
      const current = prev[field];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  }

  return (
    <div>
      <FacetBar
        facetDefinitions={facetDefinitions}
        filters={filters}
        counts={counts}
        onToggle={handleToggle}
      />
      <ResultsList faculty={filtered} />
    </div>
  );
}
