import { GENERATED_SCHOOL_ICONS } from './schoolIcons.generated';

// Hand-curated logos that must never be overwritten by the automated fetch.
const MANUAL_OVERRIDES: Record<string, string> = {
  wharton: '/school-icons/wharton.jpeg',
  'chicago-booth': '/school-icons/chicago-booth.jpg',
  'ucla-anderson': '/school-icons/ucla-anderson.svg',
  'unc-kenan-flagler': '/school-icons/unc-kenan-flagler.png',
  // Hand-picked for schools the automated fetch couldn't source.
  'utdallas-jindal': '/school-icons/utdallas-jindal.jpeg',
  'uw-foster': '/school-icons/uw-foster.png',
  'penn-state-smeal': '/school-icons/penn-state-smeal.png',
  'rsm-erasmus': '/school-icons/rsm-erasmus.png',
  'mcgill-desautels': '/school-icons/mcgill-desautels.jpg',
  'uconn-business': '/school-icons/uconn-business.png',
  'miami-business': '/school-icons/miami-business.png',
  'houston-bauer': '/school-icons/houston-bauer.png',
  'south-carolina-moore': '/school-icons/south-carolina-moore.jpg',
  'ustc-som': '/school-icons/ustc-som.png',
  'uc-irvine-merage': '/school-icons/uc-irvine-merage.png',
  'bocconi-sda': '/school-icons/bocconi-sda.jpg',
  'frankfurt-school': '/school-icons/frankfurt-school.jpeg',
};

export function getSchoolIconUrl(slug: string): string | null {
  return MANUAL_OVERRIDES[slug] ?? GENERATED_SCHOOL_ICONS[slug] ?? null;
}
