'use client';

import { useEffect, useState } from 'react';
import type { Faculty } from '@/lib/types';
import { FacultyCard } from './FacultyCard';

const PAGE_SIZE = 20;

export function ResultsList({ faculty }: { faculty: Faculty[] }) {
  const sorted = [...faculty].sort((a, b) => a.name.localeCompare(b.name));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [faculty]);

  const visible = sorted.slice(0, visibleCount);

  return (
    <div>
      <p className="text-sm text-gray-secondary mb-2">
        {sorted.length} result{sorted.length === 1 ? '' : 's'}
      </p>
      <div className="flex flex-col gap-3">
        {visible.map((f) => (
          <FacultyCard key={f.id} faculty={f} />
        ))}
      </div>
      {visibleCount < sorted.length && (
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="rounded-full px-4 py-2 text-sm bg-accent-soft text-accent-soft-text hover:bg-accent hover:text-white transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
