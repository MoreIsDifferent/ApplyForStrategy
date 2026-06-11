'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TopicDistributionEntry } from '@/lib/portfolio';

// 11 shades of blue (one per topic category), varied in hue and lightness for more contrast.
const COLORS = [
  'hsla(210, 70%, 50%, 0.9)',
  'hsla(195, 75%, 78%, 0.9)',
  'hsla(228, 65%, 38%, 0.9)',
  'hsla(200, 85%, 88%, 0.9)',
  'hsla(242, 55%, 62%, 0.9)',
  'hsla(185, 65%, 50%, 0.9)',
  'hsla(215, 75%, 72%, 0.9)',
  'hsla(252, 50%, 78%, 0.9)',
  'hsla(192, 85%, 32%, 0.9)',
  'hsla(232, 70%, 88%, 0.9)',
  'hsla(205, 45%, 45%, 0.9)',
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
          content={(props) => {
            const payload = (props as unknown as {
              payload?: { value: string; color: string; payload: TopicDistributionEntry }[];
            }).payload;
            if (!payload) return null;
            return (
              <ul className="flex flex-col gap-1.5">
                {payload.map((entry) => (
                  <li key={entry.value} className="flex items-center gap-2 text-xs font-medium text-navy">
                    <span
                      className="inline-block w-4 h-4 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span>
                      {entry.value} ({entry.payload.percentage}%)
                    </span>
                  </li>
                ))}
              </ul>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
