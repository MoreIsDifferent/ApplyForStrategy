import type { Faculty } from './types';

export interface TopicDistributionEntry {
  topic: string;
  count: number;
  percentage: number;
}

export function getTopicDistribution(faculty: Faculty[]): TopicDistributionEntry[] {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const f of faculty) {
    for (const topic of f.topics) {
      counts[topic] = (counts[topic] ?? 0) + 1;
      total += 1;
    }
  }
  return Object.entries(counts)
    .map(([topic, count]) => ({
      topic,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}
