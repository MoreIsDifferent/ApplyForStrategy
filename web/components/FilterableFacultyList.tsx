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
import { FacetColumn } from './FacetColumn';
import { TopicFacet } from './TopicFacet';
import { RankingFacet } from './RankingFacet';
import { ResultsList } from './ResultsList';
import type { FacetColorScheme } from '@/lib/facetColors';

const FACULTY_FACET_DEFS: { field: FacetField; title: string; colorScheme: FacetColorScheme }[] = [
  { field: 'theories', title: 'Theory', colorScheme: 'theory' },
  { field: 'methodology', title: 'Methodology', colorScheme: 'method' },
  { field: 'title', title: 'Title', colorScheme: 'title' },
];

const ALL_FIELDS: FacetField[] = ['topics', 'theories', 'methodology', 'geography', 'title', 'ranking'];

function uniqueValues(faculty: Faculty[], field: FacetField): string[] {
  const set = new Set<string>();
  for (const f of faculty) {
    valuesForField(f, field).forEach((v) => set.add(v));
  }
  return Array.from(set).sort();
}

export function FilterableFacultyList({ faculty }: { faculty: Faculty[] }) {
  const [filters, setFilters] = useState<FacetFilters>(EMPTY_FILTERS);

  const facultyFacetDefinitions = useMemo(
    () =>
      FACULTY_FACET_DEFS.map((def) => ({
        ...def,
        options: uniqueValues(faculty, def.field),
      })),
    [faculty]
  );

  const geographyOptions = useMemo(() => uniqueValues(faculty, 'geography'), [faculty]);

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

  function handleRankingChange(label: string, bucket: string | null) {
    setFilters((prev) => {
      const prefix = `${label}:`;
      const withoutLabel = prev.ranking.filter((v) => !v.startsWith(prefix));
      const next = bucket ? [...withoutLabel, `${label}:${bucket}`] : withoutLabel;
      return { ...prev, ranking: next };
    });
  }

  return (
    <div>
      <h2 className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase border-b border-divider pb-2 mb-3">
        Filter by Faculty
      </h2>
      <div className="bg-white border border-divider rounded-lg p-3 flex flex-wrap gap-4 mb-6">
        <TopicFacet
          groups={topicGroups}
          counts={counts.topics}
          selected={filters.topics}
          onToggle={(value) => handleToggle('topics', value)}
        />
        <FacetBar
          facetDefinitions={facultyFacetDefinitions}
          filters={filters}
          counts={counts}
          onToggle={handleToggle}
        />
      </div>

      <h2 className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase border-b border-divider pb-2 mb-3">
        Filter by Program
      </h2>
      <div className="bg-white border border-divider rounded-lg p-3 flex flex-wrap gap-4 mb-6">
        <FacetColumn
          title="Geography"
          colorScheme="geo"
          options={geographyOptions}
          counts={counts.geography}
          selected={filters.geography}
          onToggle={(value) => handleToggle('geography', value)}
        />
        <RankingFacet
          counts={counts.ranking}
          selected={filters.ranking}
          onChange={handleRankingChange}
        />
      </div>

      <ResultsList faculty={filtered} />
    </div>
  );
}
