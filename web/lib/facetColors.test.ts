import { describe, it, expect } from 'vitest';
import { pillClasses } from './facetColors';

describe('pillClasses', () => {
  describe('topic scheme', () => {
    it('returns selected topic pill classes with bg-accent and text-white', () => {
      const result = pillClasses('topic', true);
      expect(result).toContain('bg-accent');
      expect(result).toContain('text-white');
      expect(result).not.toContain('bg-accent-soft');
    });

    it('returns unselected topic pill classes with bg-accent-soft and text-accent-soft-text', () => {
      const result = pillClasses('topic', false);
      expect(result).toContain('bg-accent-soft');
      expect(result).toContain('text-accent-soft-text');
    });
  });

  describe('theory scheme', () => {
    it('returns selected theory pill classes with bg-theory and text-white', () => {
      const result = pillClasses('theory', true);
      expect(result).toContain('bg-theory');
      expect(result).toContain('text-white');
      expect(result).not.toContain('bg-theory-soft');
    });

    it('returns unselected theory pill classes with bg-theory-soft and text-theory-soft-text', () => {
      const result = pillClasses('theory', false);
      expect(result).toContain('bg-theory-soft');
      expect(result).toContain('text-theory-soft-text');
    });
  });

  describe('method scheme', () => {
    it('returns selected method pill classes with bg-method and text-method-text', () => {
      const result = pillClasses('method', true);
      expect(result).toContain('bg-method');
      expect(result).toContain('text-method-text');
      expect(result).not.toContain('bg-method-soft');
    });

    it('returns unselected method pill classes with bg-method-soft and text-method-soft-text', () => {
      const result = pillClasses('method', false);
      expect(result).toContain('bg-method-soft');
      expect(result).toContain('text-method-soft-text');
    });
  });

  describe('geo scheme', () => {
    it('returns selected geo pill classes with bg-geo and text-white', () => {
      const result = pillClasses('geo', true);
      expect(result).toContain('bg-geo');
      expect(result).toContain('text-white');
      expect(result).not.toContain('bg-geo-soft');
    });

    it('returns unselected geo pill classes with bg-geo-soft and text-geo-soft-text', () => {
      const result = pillClasses('geo', false);
      expect(result).toContain('bg-geo-soft');
      expect(result).toContain('text-geo-soft-text');
    });
  });
});
