import Link from 'next/link';
import type { Faculty } from '@/lib/types';
import { pillClasses } from '@/lib/facetColors';
import { getInitials } from '@/lib/initials';
import { getSchoolIconUrl } from '@/lib/schoolIcons';

export function FacultyCard({ faculty }: { faculty: Faculty }) {
  const iconUrl = getSchoolIconUrl(faculty.school.slug) ?? faculty.school.logo_url;

  return (
    <div className="bg-white border border-divider rounded-lg p-4 hover:border-accent transition-colors flex items-start justify-between gap-3">
      <Link href={`/faculty/${faculty.id}`} className="block flex-1 min-w-0">
        <div className="font-semibold text-charcoal text-[15px]">{faculty.name}</div>
        {faculty.title && (
          <div className="text-xs text-gray-secondary mt-0.5">{faculty.title}</div>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
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
      <Link
        href={`/schools/${faculty.school.slug}`}
        className="flex flex-col items-center gap-1 flex-shrink-0 w-16 text-center group"
      >
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconUrl}
            alt=""
            className="w-10 h-10 rounded-md object-contain bg-white border border-divider p-1"
          />
        ) : (
          <div className="w-10 h-10 rounded-md bg-accent-soft text-accent-soft-text flex items-center justify-center text-xs font-bold">
            {getInitials(faculty.school.name)}
          </div>
        )}
        <span className="text-[11px] text-gray-secondary leading-tight group-hover:text-accent">
          {faculty.school.name}
        </span>
      </Link>
    </div>
  );
}
