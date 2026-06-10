import Link from 'next/link';
import type { Faculty } from '@/lib/types';

export function FacultyCard({ faculty }: { faculty: Faculty }) {
  return (
    <Link
      href={`/faculty/${faculty.id}`}
      className="block bg-white border border-divider rounded-lg p-4 hover:border-accent transition-colors"
    >
      <div className="font-semibold text-charcoal text-[15px]">{faculty.name}</div>
      <div className="text-xs text-gray-secondary mt-0.5 mb-2">
        {faculty.title ? `${faculty.title} — ` : ''}
        {faculty.school.name}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {faculty.topics.map((t) => (
          <span
            key={t.name}
            className="bg-accent-soft text-accent-soft-text rounded-full px-2.5 py-0.5 text-[11px]"
          >
            {t.name}
          </span>
        ))}
      </div>
      {faculty.methodology && (
        <div className="text-[11px] text-muted">Methodology: {faculty.methodology}</div>
      )}
    </Link>
  );
}
