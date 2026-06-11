import Link from 'next/link';
import type { Faculty } from '@/lib/types';
import { pillClasses } from '@/lib/facetColors';
import { getInitials } from '@/lib/initials';

export function FacultyCard({ faculty }: { faculty: Faculty }) {
  return (
    <Link
      href={`/faculty/${faculty.id}`}
      className="block bg-white border border-divider rounded-lg p-4 hover:border-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-semibold text-charcoal text-[15px]">{faculty.name}</div>
          {faculty.title && (
            <div className="text-xs text-gray-secondary mt-0.5">{faculty.title}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {faculty.school.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={faculty.school.logo_url}
              alt=""
              className="w-5 h-5 rounded-full object-cover border border-divider"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-accent-soft text-accent-soft-text flex items-center justify-center text-[9px] font-bold flex-shrink-0">
              {getInitials(faculty.school.name)}
            </div>
          )}
          <span className="text-xs text-gray-secondary whitespace-nowrap">{faculty.school.name}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {faculty.topics.map((t) => (
          <span key={t.name} className={pillClasses('topic', false)}>
            {t.name}
          </span>
        ))}
        {faculty.theories.map((theory) => (
          <span key={theory} className={pillClasses('theory', false)}>
            {theory}
          </span>
        ))}
        {faculty.methodology && (
          <span className={pillClasses('method', false)}>{faculty.methodology}</span>
        )}
        <span className={pillClasses('geo', false)}>{faculty.school.geography}</span>
      </div>
    </Link>
  );
}
