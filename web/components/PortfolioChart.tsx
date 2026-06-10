'use client';

import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import type { TopicDistributionEntry } from '@/lib/portfolio';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777'];

export function PortfolioChart({ data }: { data: TopicDistributionEntry[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No topic data available.</p>;
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
