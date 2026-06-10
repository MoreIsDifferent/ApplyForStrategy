'use client';

interface FacetColumnProps {
  title: string;
  options: string[];
  counts: Record<string, number>;
  selected: string[];
  onToggle: (value: string) => void;
}

export function FacetColumn({ title, options, counts, selected, onToggle }: FacetColumnProps) {
  return (
    <div className="flex-1 min-w-[160px]">
      <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">{title}</h3>
      <ul className="space-y-1">
        {options.map((option) => (
          <li key={option}>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => onToggle(option)}
              />
              <span>{option}</span>
              <span className="text-gray-400">({counts[option] ?? 0})</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
