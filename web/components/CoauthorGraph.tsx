import { getInitials } from '@/lib/initials';
import { coauthorGraphLayout } from '@/lib/coauthorGraph';
import type { Coauthor } from '@/lib/types';

export function CoauthorGraph({
  centerName,
  coauthors,
}: {
  centerName: string;
  coauthors: Coauthor[];
}) {
  if (coauthors.length === 0) return null;
  const layout = coauthorGraphLayout(coauthors);

  return (
    <div className="bg-white border border-divider rounded-lg p-4 mt-4">
      <h2 className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-3">
        Frequent Coauthors
      </h2>
      <svg
        viewBox={`0 0 ${layout.size} ${layout.size}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Coauthor graph for ${centerName}`}
      >
        {layout.nodes.map((n) => (
          <line
            key={`line-${n.name}`}
            x1={layout.center.x}
            y1={layout.center.y}
            x2={n.x}
            y2={n.y}
            className="stroke-divider"
            strokeWidth={n.strokeWidth}
          />
        ))}
        {layout.nodes.map((n) => {
          const body = (
            <>
              <circle
                cx={n.x}
                cy={n.y}
                r={n.radius}
                className={n.facultyId ? 'fill-accent-soft stroke-accent' : 'fill-white stroke-divider'}
              />
              <text x={n.x} y={n.y + n.radius + 12} textAnchor="middle" className="fill-charcoal text-[10px]">
                {n.name}
              </text>
            </>
          );
          return n.facultyId ? (
            <a key={n.name} href={`/faculty/${n.facultyId}`}>
              {body}
            </a>
          ) : (
            <g key={n.name}>{body}</g>
          );
        })}
        <circle cx={layout.center.x} cy={layout.center.y} r={22} className="fill-accent" />
        <text
          x={layout.center.x}
          y={layout.center.y + 4}
          textAnchor="middle"
          className="fill-white text-[11px] font-bold"
        >
          {getInitials(centerName)}
        </text>
      </svg>
    </div>
  );
}
