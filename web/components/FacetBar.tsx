import { FacetColumn } from './FacetColumn';
import type { FacetField, FacetFilters } from '@/lib/filtering';
import type { FacetColorScheme } from '@/lib/facetColors';

interface FacetDefinition {
  field: FacetField;
  title: string;
  options: string[];
  colorScheme: FacetColorScheme;
}

interface FacetBarProps {
  facetDefinitions: FacetDefinition[];
  filters: FacetFilters;
  counts: Partial<Record<FacetField, Record<string, number>>>;
  onToggle: (field: FacetField, value: string) => void;
}

export function FacetBar({ facetDefinitions, filters, counts, onToggle }: FacetBarProps) {
  return (
    <>
      {facetDefinitions.map((def) => (
        <FacetColumn
          key={def.field}
          title={def.title}
          colorScheme={def.colorScheme}
          options={def.options}
          counts={counts[def.field] ?? {}}
          selected={filters[def.field]}
          onToggle={(value) => onToggle(def.field, value)}
        />
      ))}
    </>
  );
}
