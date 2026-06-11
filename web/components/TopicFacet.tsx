'use client';

import { useState } from 'react';
import type { TopicCategoryGroup } from '@/lib/filtering';
import { pillClasses } from '@/lib/facetColors';

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
    <div className="flex-1 min-w-[140px]">
      <h3 className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-2">Topic</h3>
      <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-2">
        {visibleGroups.map((group) => (
          <div key={group.category}>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-pressed={selected.includes(group.category)}
                onClick={() => onToggle(group.category)}
                className={pillClasses('topic', selected.includes(group.category))}
              >
                {group.category} ({group.count})
              </button>
              <button
                type="button"
                aria-label={`Toggle ${group.category}`}
                onClick={() => toggleExpanded(group.category)}
                className="text-gray-secondary text-xs px-1"
              >
                {expanded.has(group.category) ? '▾' : '▸'}
              </button>
            </div>
            {expanded.has(group.category) && (
              <div className="flex flex-wrap gap-1 ml-4 mt-1.5">
                {group.topics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    aria-pressed={selected.includes(topic)}
                    onClick={() => onToggle(topic)}
                    className={pillClasses('topic', selected.includes(topic)) + ' text-[11px] px-2 py-0.5'}
                  >
                    {topic} ({counts[topic] ?? 0})
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
