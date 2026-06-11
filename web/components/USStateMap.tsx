import { getUSStatePaths } from '@/lib/usMap';

interface USStateMapProps {
  highlightState: string | null;
}

export function USStateMap({ highlightState }: USStateMapProps) {
  const paths = getUSStatePaths();

  return (
    <svg viewBox="0 0 975 610" className="w-full h-auto" role="img" aria-label="Map of the United States">
      {paths.map((p) => (
        <path
          key={p.name}
          d={p.d}
          className={p.name === highlightState ? 'fill-accent' : 'fill-divider'}
          stroke="#FAFAF8"
          strokeWidth={0.75}
        >
          <title>{p.name}</title>
        </path>
      ))}
    </svg>
  );
}
