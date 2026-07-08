import type { Publication } from '@/lib/types';

export function PublicationList({ publications }: { publications: Publication[] }) {
  if (publications.length === 0) return null;
  return (
    <div className="bg-white border border-divider rounded-lg p-4 mt-4">
      <h2 className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-1">
        Selected Publications
      </h2>
      <p className="text-[11px] text-gray-secondary mb-3">Publications matched via OpenAlex</p>
      <ul className="space-y-2">
        {publications.map((p) => (
          <li key={p.title} className="text-sm text-charcoal">
            <span className="font-medium">{p.title}</span>
            <span className="text-gray-secondary">
              {p.journal ? ` — ${p.journal}` : ''}
              {p.year ? ` (${p.year})` : ''}
              {` · ${p.citation_count} citations`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
