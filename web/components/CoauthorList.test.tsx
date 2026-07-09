import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoauthorList } from './CoauthorList';

describe('CoauthorList', () => {
  it('renders nothing when there are no coauthors', () => {
    const { container } = render(<CoauthorList coauthors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each coauthor name (with its count when > 1)', () => {
    render(<CoauthorList coauthors={[{ name: 'Bob', count: 3, facultyId: null }]} />);
    expect(screen.getByText('Bob (3)')).toBeInTheDocument();
  });

  it('omits the count suffix when count is 1', () => {
    render(<CoauthorList coauthors={[{ name: 'Solo', count: 1, facultyId: null }]} />);
    expect(screen.getByText('Solo')).toBeInTheDocument();
    expect(screen.queryByText(/\(1\)/)).not.toBeInTheDocument();
  });
});
