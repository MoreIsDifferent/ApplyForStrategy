export type FacetColorScheme = 'topic' | 'theory' | 'method' | 'geo';

export function pillClasses(scheme: FacetColorScheme, selected: boolean): string {
  const baseClasses = 'rounded-full px-3 py-1 text-xs transition-colors';

  const colorMap: Record<FacetColorScheme, { selected: string; unselected: string }> = {
    topic: {
      selected: 'bg-accent text-white',
      unselected: 'bg-accent-soft text-accent-soft-text',
    },
    theory: {
      selected: 'bg-theory text-white',
      unselected: 'bg-theory-soft text-theory-soft-text',
    },
    method: {
      selected: 'bg-method text-method-text',
      unselected: 'bg-method-soft text-method-soft-text',
    },
    geo: {
      selected: 'bg-geo text-white',
      unselected: 'bg-geo-soft text-geo-soft-text',
    },
  };

  const colorClasses = selected ? colorMap[scheme].selected : colorMap[scheme].unselected;

  return `${baseClasses} ${colorClasses}`;
}
