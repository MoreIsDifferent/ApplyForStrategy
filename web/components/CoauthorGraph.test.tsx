import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoauthorGraph } from './CoauthorGraph';
import type { Coauthor } from '@/lib/types';

const co = (name: string, count: number, facultyId: string | null): Coauthor => ({ name, count, facultyId });

describe('CoauthorGraph', () => {
  it('renders nothing when there are no coauthors', () => {
    const { container } = render(<CoauthorGraph centerName="Alice" coauthors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('links an in-network coauthor to their faculty page', () => {
    const { container } = render(
      <CoauthorGraph centerName="Alice" coauthors={[co('Bob', 2, 'f2')]} />
    );
    expect(container.querySelector('a[href="/faculty/f2"]')).not.toBeNull();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('does not link an external coauthor', () => {
    const { container } = render(
      <CoauthorGraph centerName="Alice" coauthors={[co('Ext Person', 1, null)]} />
    );
    expect(container.querySelector('a')).toBeNull();
    expect(screen.getByText('Ext Person')).toBeInTheDocument();
  });

  it('shows the center faculty initials', () => {
    render(<CoauthorGraph centerName="Alice Nguyen" coauthors={[co('Bob', 1, 'f2')]} />);
    expect(screen.getByText('AN')).toBeInTheDocument();
  });
});
