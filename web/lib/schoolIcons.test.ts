import { describe, it, expect, vi } from 'vitest';

vi.mock('./schoolIcons.generated', () => ({
  GENERATED_SCHOOL_ICONS: {
    'mit-sloan': '/school-icons/mit-sloan.png',
    wharton: '/school-icons/wharton-generated.png',
  },
}));

import { getSchoolIconUrl } from './schoolIcons';

describe('getSchoolIconUrl', () => {
  it('returns a manual override even when a generated entry exists', () => {
    expect(getSchoolIconUrl('wharton')).toBe('/school-icons/wharton.jpeg');
  });

  it('falls back to the generated map when there is no override', () => {
    expect(getSchoolIconUrl('mit-sloan')).toBe('/school-icons/mit-sloan.png');
  });

  it('returns null for a slug in neither map', () => {
    expect(getSchoolIconUrl('unknown-school')).toBeNull();
  });
});
