'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TopicDistributionEntry } from '@/lib/portfolio';

// 11 distinct hues (one per topic category), light and semi-transparent so no two slices repeat.
const COLORS = [
  'hsla(0, 65%, 75%, 0.6)',
  'hsla(33, 65%, 75%, 0.6)',
  'hsla(65, 65%, 75%, 0.6)',
  'hsla(98, 65%, 75%, 0.6)',
  'hsla(131, 65%, 75%, 0.6)',
  'hsla(164, 65%, 75%, 0.6)',
  'hsla(196, 65%, 75%, 0.6)',
  'hsla(229, 65%, 75%, 0.6)',
  'hsla(262, 65%, 75%, 0.6)',
  'hsla(295, 65%, 75%, 0.6)',
  'hsla(327, 65%, 75%, 0.6)',
];

export function PortfolioChart({ data }: { data: TopicDistributionEntry[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-secondary">No topic data available.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={360}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="topic"
          cx="35%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={1}
        >
          {data.map((entry, index) => (
            <Cell key={entry.topic} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name, item) => [`${value} (${(item.payload as TopicDistributionEntry).percentage}%)`, name]} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          formatter={(value, entry) => {
            const payload = (entry as unknown as { payload: TopicDistributionEntry }).payload;
            return `${value} (${payload.percentage}%)`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
