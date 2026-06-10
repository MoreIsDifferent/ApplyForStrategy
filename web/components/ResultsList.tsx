import type { Faculty } from '@/lib/types';
import { FacultyCard } from './FacultyCard';

export function ResultsList({ faculty }: { faculty: Faculty[] }) {
  const sorted = [...faculty].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">
        {sorted.length} result{sorted.length === 1 ? '' : 's'}
      </p>
      <div className="flex flex-col gap-2">
        {sorted.map((f) => (
          <FacultyCard key={f.id} faculty={f} />
        ))}
      </div>
    </div>
  );
}
