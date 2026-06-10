'use client';

import { useMemo, useState } from 'react';
import type { Faculty } from '@/lib/types';
import {
  applyFilters,
  getFacetCounts,
  getTopicTaxonomy,
  valuesForField,
  EMPTY_FILTERS,
  type FacetField,
  type FacetFilters,
} from '@/lib/filtering';
import { FacetBar } from './FacetBar';
import { TopicFacet } from './TopicFacet';
import { ResultsList } from './ResultsList';

const FACET_DEFS: { field: FacetField; title: string }[] = [
  { field: 'theories', title: 'Theory' },
  { field: 'methodology', title: 'Methodology' },
  { field: 'geography', title: 'Geography' },
];

const ALL_FIELDS: FacetField[] = ['topics', 'theories', 'methodology', 'geography'];

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

  const topicGroups = useMemo(() => getTopicTaxonomy(faculty), [faculty]);

  const counts = useMemo(() => {
    const result = {} as Record<FacetField, Record<string, number>>;
    for (const field of ALL_FIELDS) {
      result[field] = getFacetCounts(faculty, filters, field);
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
      <div className="flex flex-wrap gap-6 border-b pb-4 mb-4">
        <TopicFacet
          groups={topicGroups}
          counts={counts.topics}
          selected={filters.topics}
          onToggle={(value) => handleToggle('topics', value)}
        />
        <FacetBar
          facetDefinitions={facetDefinitions}
          filters={filters}
          counts={counts}
          onToggle={handleToggle}
        />
      </div>
      <ResultsList faculty={filtered} />
    </div>
  );
}
