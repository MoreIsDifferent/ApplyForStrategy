'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TopicDistributionEntry } from '@/lib/portfolio';

const COLORS = ['#4B9CD3', '#7CB9E8', '#2b6f9e', '#9AA5B1', '#A8D5BA', '#E8B86D', '#D88C8C'];

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
