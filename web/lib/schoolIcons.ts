const SCHOOL_ICONS: Record<string, string> = {
  wharton: '/school-icons/wharton.jpeg',
  'chicago-booth': '/school-icons/chicago-booth.jpg',
  'ucla-anderson': '/school-icons/ucla-anderson.svg',
};

export function getSchoolIconUrl(slug: string): string | null {
  return SCHOOL_ICONS[slug] ?? null;
}
