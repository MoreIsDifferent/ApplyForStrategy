'use client';

import { useEffect, useState } from 'react';
import type { Faculty } from '@/lib/types';
import { FacultyCard } from './FacultyCard';

const PAGE_SIZE = 20;

export function ResultsList({ faculty }: { faculty: Faculty[] }) {
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sorted = [...faculty]
    .filter((f) => f.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [faculty, search]);

  const visible = sorted.slice(0, visibleCount);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-sm text-gray-secondary">
          {sorted.length} result{sorted.length === 1 ? '' : 's'}
        </p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search faculty by name"
          className="w-48 sm:w-64 rounded-full border border-divider px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
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
