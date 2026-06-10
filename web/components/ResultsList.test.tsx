import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsList } from './ResultsList';
import { allFaculty } from '@/lib/sampleData';

describe('ResultsList', () => {
  it('shows a result count and renders faculty sorted alphabetically by name', () => {
    const subset = [allFaculty[1], allFaculty[0]]; // Robert Chen, Jane Doe
    render(<ResultsList faculty={subset} />);
    expect(screen.getByText('2 results')).toBeInTheDocument();
    const names = screen.getAllByText(/^(Jane Doe|Robert Chen)$/).map((el) => el.textContent);
    expect(names).toEqual(['Jane Doe', 'Robert Chen']);
  });

  it('uses singular "result" for exactly one match', () => {
    render(<ResultsList faculty={[allFaculty[0]]} />);
    expect(screen.getByText('1 result')).toBeInTheDocument();
  });
});
