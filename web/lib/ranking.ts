import type { School } from './types';

export interface RankingTypeDef {
  field: keyof Pick<School, 'ranking_utd' | 'ranking_tamuga' | 'ranking_qs' | 'ranking_usnews'>;
  label: string;
}

export const RANKING_TYPES: RankingTypeDef[] = [
  { field: 'ranking_utd', label: 'UTD Top 100' },
  { field: 'ranking_tamuga', label: 'TAMU' },
  { field: 'ranking_usnews', label: 'US News' },
  { field: 'ranking_qs', label: 'QS' },
];

export const RANKING_BUCKETS = ['1-20', '20-50', '50-100', '100-200', '200+'] as const;
export type RankingBucket = (typeof RANKING_BUCKETS)[number];

export function getRankingBucket(rank: number | null): RankingBucket | null {
  if (rank == null) return null;
  if (rank <= 20) return '1-20';
  if (rank <= 50) return '20-50';
  if (rank <= 100) return '50-100';
  if (rank <= 200) return '100-200';
  return '200+';
}

export function rankingOptionValue(label: string, bucket: RankingBucket): string {
  return `${label}:${bucket}`;
}

export function getRankingValues(school: School): string[] {
  const values: string[] = [];
  for (const { field, label } of RANKING_TYPES) {
    const bucket = getRankingBucket(school[field]);
    if (bucket) values.push(rankingOptionValue(label, bucket));
  }
  return values;
}
