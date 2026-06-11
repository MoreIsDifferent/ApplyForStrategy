const SCHOOL_STATE_BY_SLUG: Record<string, string> = {
  wharton: 'Pennsylvania',
  'chicago-booth': 'Illinois',
  'ucla-anderson': 'California',
};

export function getSchoolState(slug: string): string | null {
  return SCHOOL_STATE_BY_SLUG[slug] ?? null;
}
