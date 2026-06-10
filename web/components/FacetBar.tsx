import { FacetColumn } from './FacetColumn';
import type { FacetField, FacetFilters } from '@/lib/filtering';

interface FacetDefinition {
  field: FacetField;
  title: string;
  options: string[];
}

interface FacetBarProps {
  facetDefinitions: FacetDefinition[];
  filters: FacetFilters;
  counts: Record<FacetField, Record<string, number>>;
  onToggle: (field: FacetField, value: string) => void;
}

export function FacetBar({ facetDefinitions, filters, counts, onToggle }: FacetBarProps) {
  return (
    <div className="flex flex-wrap gap-6 border-b pb-4 mb-4">
      {facetDefinitions.map((def) => (
        <FacetColumn
          key={def.field}
          title={def.title}
          options={def.options}
          counts={counts[def.field]}
          selected={filters[def.field]}
          onToggle={(value) => onToggle(def.field, value)}
        />
      ))}
    </div>
  );
}
