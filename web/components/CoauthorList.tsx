import type { Coauthor } from '@/lib/types';

export function CoauthorList({ coauthors }: { coauthors: Coauthor[] }) {
  if (coauthors.length === 0) return null;
  return (
    <div className="bg-white border border-divider rounded-lg p-4 mt-4">
      <h2 className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-3">
        Frequent Coauthors
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {coauthors.map((c) => (
          <span key={c.name} className="bg-accent-soft text-accent-soft-text rounded-full px-2.5 py-0.5 text-[11px]">
            {c.name}
            {c.count > 1 ? ` (${c.count})` : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
