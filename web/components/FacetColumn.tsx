'use client';

import { pillClasses, type FacetColorScheme } from '../lib/facetColors';

interface FacetColumnProps {
  title: string;
  colorScheme: FacetColorScheme;
  options: string[];
  counts: Record<string, number>;
  selected: string[];
  onToggle: (value: string) => void;
}

export function FacetColumn({ title, colorScheme, options, counts, selected, onToggle }: FacetColumnProps) {
  return (
    <div className="flex-1 min-w-[160px]">
      <h3 className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-2">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={selected.includes(option)}
            onClick={() => onToggle(option)}
            className={pillClasses(colorScheme, selected.includes(option))}
          >
            {option} ({counts[option] ?? 0})
          </button>
        ))}
      </div>
    </div>
  );
}
