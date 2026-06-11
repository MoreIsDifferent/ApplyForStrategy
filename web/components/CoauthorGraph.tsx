import Link from 'next/link';
import type { Faculty } from '@/lib/types';
import { getInitials } from '@/lib/initials';

interface CoauthorGraphProps {
  faculty: Faculty;
  coauthors: Faculty[];
}

const CENTER = 50;
const RADIUS = 38;

export function CoauthorGraph({ faculty, coauthors }: CoauthorGraphProps) {
  const positions = coauthors.map((_, i) => {
    const angle = (2 * Math.PI * i) / coauthors.length - Math.PI / 2;
    return {
      x: CENTER + RADIUS * Math.cos(angle),
      y: CENTER + RADIUS * Math.sin(angle),
    };
  });

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {positions.map((p, i) => (
          <line
            key={coauthors[i].id}
            x1={CENTER}
            y1={CENTER}
            x2={p.x}
            y2={p.y}
            stroke="var(--color-divider)"
            strokeWidth={0.5}
          />
        ))}
      </svg>

      <div
        className="absolute flex flex-col items-center gap-1"
        style={{ left: `${CENTER}%`, top: `${CENTER}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className="w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
          {getInitials(faculty.name)}
        </div>
        <span className="text-[11px] text-charcoal text-center max-w-[90px] leading-tight">{faculty.name}</span>
      </div>

      {coauthors.map((coauthor, i) => {
        const p = positions[i];
        return (
          <Link
            key={coauthor.id}
            href={`/faculty/${coauthor.id}`}
            className="absolute flex flex-col items-center gap-1 group"
            style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-10 h-10 rounded-full bg-accent-soft text-accent-soft-text flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors group-hover:bg-accent group-hover:text-white">
              {getInitials(coauthor.name)}
            </div>
            <span className="text-[10px] text-gray-secondary text-center max-w-[80px] leading-tight transition-colors group-hover:text-accent">
              {coauthor.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
