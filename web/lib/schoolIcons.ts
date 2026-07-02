import { GENERATED_SCHOOL_ICONS } from './schoolIcons.generated';

// Hand-curated logos that must never be overwritten by the automated fetch.
const MANUAL_OVERRIDES: Record<string, string> = {
  wharton: '/school-icons/wharton.jpeg',
  'chicago-booth': '/school-icons/chicago-booth.jpg',
  'ucla-anderson': '/school-icons/ucla-anderson.svg',
  'unc-kenan-flagler': '/school-icons/unc-kenan-flagler.png',
};

export function getSchoolIconUrl(slug: string): string | null {
  return MANUAL_OVERRIDES[slug] ?? GENERATED_SCHOOL_ICONS[slug] ?? null;
}
