import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoauthorList } from './CoauthorList';

describe('CoauthorList', () => {
  it('renders nothing when there are no coauthors', () => {
    const { container } = render(<CoauthorList coauthors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each coauthor name (with its count when > 1)', () => {
    render(<CoauthorList coauthors={[{ name: 'Bob', count: 3 }]} />);
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    expect(screen.getByText(/\(3\)/)).toBeInTheDocument();
  });
});
