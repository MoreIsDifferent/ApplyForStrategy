'use client';

import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import type { TopicDistributionEntry } from '@/lib/portfolio';

const COLORS = ['#4B9CD3', '#7CB9E8', '#2b6f9e', '#9AA5B1', '#A8D5BA', '#E8B86D', '#D88C8C'];

export function PortfolioChart({ data }: { data: TopicDistributionEntry[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-secondary">No topic data available.</p>;
  }
  return (
    <PieChart width={400} height={300}>
      <Pie
        data={data}
        dataKey="count"
        nameKey="topic"
        innerRadius={60}
        outerRadius={100}
        label={(entry) => {
          const item = entry as unknown as TopicDistributionEntry;
          return `${item.topic} (${item.percentage}%)`;
        }}
      >
        {data.map((entry, index) => (
          <Cell key={entry.topic} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  );
}
