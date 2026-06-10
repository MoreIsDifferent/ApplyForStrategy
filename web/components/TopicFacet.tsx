'use client';

import { useState } from 'react';
import type { TopicCategoryGroup } from '@/lib/filtering';

interface TopicFacetProps {
  groups: TopicCategoryGroup[];
  counts: Record<string, number>;
  selected: string[];
  onToggle: (value: string) => void;
}

export function TopicFacet({ groups, counts, selected, onToggle }: TopicFacetProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(category: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  const visibleGroups = groups
    .map((group) => ({
      category: group.category,
      count: counts[group.category] ?? 0,
      topics: group.topics
        .filter((topic) => (counts[topic] ?? 0) > 0)
        .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b)),
    }))
    .filter((group) => group.count > 0);

  return (
    <div className="flex-1 min-w-[200px]">
      <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">Topic</h3>
      <ul className="space-y-1 max-h-80 overflow-y-auto pr-2">
        {visibleGroups.map((group) => (
          <li key={group.category}>
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                aria-label={`Toggle ${group.category}`}
                onClick={() => toggleExpanded(group.category)}
                className="text-gray-400 w-4 text-left"
              >
                {expanded.has(group.category) ? '−' : '+'}
              </button>
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={selected.includes(group.category)}
                  onChange={() => onToggle(group.category)}
                />
                <span>{group.category}</span>
                <span className="text-gray-400">({group.count})</span>
              </label>
            </div>
            {expanded.has(group.category) && (
              <ul className="ml-6 space-y-1 mt-1">
                {group.topics.map((topic) => (
                  <li key={topic}>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.includes(topic)}
                        onChange={() => onToggle(topic)}
                      />
                      <span>{topic}</span>
                      <span className="text-gray-400">({counts[topic] ?? 0})</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
