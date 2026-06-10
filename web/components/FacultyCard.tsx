import Link from 'next/link';
import type { Faculty } from '@/lib/types';

export function FacultyCard({ faculty }: { faculty: Faculty }) {
  return (
    <div className="border rounded p-3 flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        <Link href={`/schools/${faculty.school.slug}`} className="font-medium text-blue-600 hover:underline">
          {faculty.school.name}
        </Link>
        <span>—</span>
        <Link href={`/faculty/${faculty.id}`} className="hover:underline">
          {faculty.name}
        </Link>
        <span className="text-gray-500 text-sm">{faculty.title}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {[...faculty.topics.map((t) => t.name), ...faculty.theories].map((tag) => (
          <span key={tag} className="text-xs bg-gray-100 rounded px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
