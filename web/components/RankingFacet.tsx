'use client';

import { pillClasses } from '@/lib/facetColors';
import { RANKING_TYPES, RANKING_BUCKETS, rankingOptionValue } from '@/lib/ranking';

interface RankingFacetProps {
  counts: Record<string, number>;
  selected: string[];
  onToggle: (value: string) => void;
}

export function RankingFacet({ counts, selected, onToggle }: RankingFacetProps) {
  const groups = RANKING_TYPES.map(({ label }) => ({
    label,
    buckets: RANKING_BUCKETS.map((bucket) => ({
      value: rankingOptionValue(label, bucket),
      bucket,
      count: counts[rankingOptionValue(label, bucket)] ?? 0,
    })).filter((b) => b.count > 0),
  })).filter((group) => group.buckets.length > 0);

  return (
    <div className="flex-1 min-w-[140px]">
      <h3 className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-2">Ranking</h3>
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="text-[11px] text-gray-secondary mb-1">{group.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {group.buckets.map(({ value, bucket, count }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected.includes(value)}
                  onClick={() => onToggle(value)}
                  className={pillClasses('ranking', selected.includes(value))}
                >
                  {bucket} ({count})
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
