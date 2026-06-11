'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Faculty } from '@/lib/types';
import {
  applyFilters,
  getFacetCounts,
  getProgramFacetCounts,
  getTopicTaxonomy,
  valuesForField,
  EMPTY_FILTERS,
  PROGRAM_FIELDS,
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

const FACULTY_FIELDS: FacetField[] = ['topics', 'theories', 'methodology', 'title'];
const PROGRAM_FILTER_FIELDS: FacetField[] = ['geography', 'ranking'];

function uniqueValues(faculty: Faculty[], field: FacetField): string[] {
  const set = new Set<string>();
  for (const f of faculty) {
    valuesForField(f, field).forEach((v) => set.add(v));
  }
  return Array.from(set).sort();
}

function filtersFromSearchParams(params: URLSearchParams): FacetFilters {
  const result: FacetFilters = { ...EMPTY_FILTERS };
  for (const field of ALL_FIELDS) {
    const values = params.getAll(field);
    if (values.length > 0) {
      result[field] = values;
    }
  }
  return result;
}

function searchParamsFromFilters(filters: FacetFilters): string {
  const params = new URLSearchParams();
  for (const field of ALL_FIELDS) {
    for (const value of filters[field]) {
      params.append(field, value);
    }
  }
  return params.toString();
}

export function FilterableFacultyList({ faculty }: { faculty: Faculty[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FacetFilters>(() => filtersFromSearchParams(searchParams));

  useEffect(() => {
    const query = searchParamsFromFilters(filters);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

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
      result[field] = PROGRAM_FIELDS.includes(field)
        ? getProgramFacetCounts(faculty, filters, field as 'geography' | 'ranking')
        : getFacetCounts(faculty, filters, field);
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

  function clearFields(fields: FacetField[]) {
    setFilters((prev) => {
      const next = { ...prev };
      for (const field of fields) {
        next[field] = [];
      }
      return next;
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
      <div className="flex items-center justify-between border-b border-divider pb-2 mb-1">
        <h2 className="text-[11px] font-bold tracking-wide text-navy uppercase">
          Filter by Faculty
        </h2>
        <button
          type="button"
          onClick={() => clearFields(FACULTY_FIELDS)}
          className="text-[11px] text-accent hover:underline"
        >
          Clear filters
        </button>
      </div>
      <p className="text-[11px] text-gray-secondary mb-3">
        Based on each faculty member&apos;s most cited and most recent research.
      </p>
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

      <div className="flex items-center justify-between border-b border-divider pb-2 mb-3">
        <h2 className="text-[11px] font-bold tracking-wide text-navy uppercase">
          Filter by Program
        </h2>
        <button
          type="button"
          onClick={() => clearFields(PROGRAM_FILTER_FIELDS)}
          className="text-[11px] text-accent hover:underline"
        >
          Clear filters
        </button>
      </div>
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
