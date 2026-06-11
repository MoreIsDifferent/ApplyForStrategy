export type TitleCategory =
  | 'Assistant Professor'
  | 'Associate Professor'
  | 'Professor'
  | 'Clinical Professor'
  | 'Adjunct Professor';

export function getTitleCategory(title: string | null): TitleCategory | null {
  if (!title) return null;
  const t = title.toLowerCase();
  if (t.includes('adjunct')) return 'Adjunct Professor';
  if (t.includes('clinical')) return 'Clinical Professor';
  if (t.includes('assistant')) return 'Assistant Professor';
  if (t.includes('associate')) return 'Associate Professor';
  if (t.includes('professor')) return 'Professor';
  return null;
}
