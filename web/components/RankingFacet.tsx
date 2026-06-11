'use client';

import { RANKING_TYPES, rankingOptionValue } from '@/lib/ranking';

interface RankingFacetProps {
  counts: Record<string, number>;
  selected: string[];
  onChange: (label: string, bucket: string | null) => void;
}

export function RankingFacet({ counts, selected, onChange }: RankingFacetProps) {
  function selectedBucketFor(label: string): string {
    const prefix = `${label}:`;
    const match = selected.find((v) => v.startsWith(prefix));
    return match ? match.slice(prefix.length) : '';
  }

  return (
    <div className="flex-1 min-w-[140px]">
      <h3 className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-2">Ranking</h3>
      <div className="flex flex-wrap gap-3">
        {RANKING_TYPES.map(({ label, buckets }) => {
          const value = selectedBucketFor(label);
          return (
            <label key={label} className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-secondary">{label}</span>
              <select
                value={value}
                onChange={(e) => onChange(label, e.target.value || null)}
                className={`text-xs rounded-md border px-2 py-1 transition-colors ${
                  value
                    ? 'bg-ranking-soft text-ranking-soft-text border-ranking'
                    : 'bg-white text-gray-secondary border-divider'
                }`}
              >
                <option value="">Any</option>
                {buckets.map((bucket) => (
                  <option key={bucket} value={bucket}>
                    {bucket} ({counts[rankingOptionValue(label, bucket)] ?? 0})
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </div>
  );
}
