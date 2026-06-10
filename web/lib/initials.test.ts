import { describe, it, expect } from 'vitest';
import { getInitials } from './initials';

describe('getInitials', () => {
  it('returns first letters of first and last name, uppercased', () => {
    expect(getInitials('Adam Grant')).toBe('AG');
  });

  it('returns a single initial for a one-word name', () => {
    expect(getInitials('Madonna')).toBe('M');
  });

  it('handles multiple spaces between names', () => {
    expect(getInitials('Mary  Jane Watson')).toBe('MJ');
  });

  it('uppercases lowercase names', () => {
    expect(getInitials('jane doe')).toBe('JD');
  });
});
