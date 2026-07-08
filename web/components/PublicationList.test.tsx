import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublicationList } from './PublicationList';
import type { Publication } from '@/lib/types';

const pubs: Publication[] = [
  { title: 'Paper A', journal: 'AMJ', year: 2020, citation_count: 50 },
];

describe('PublicationList', () => {
  it('renders nothing when there are no publications', () => {
    const { container } = render(<PublicationList publications={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title, journal, year, and citation count', () => {
    render(<PublicationList publications={pubs} />);
    expect(screen.getByText('Paper A')).toBeInTheDocument();
    expect(screen.getByText(/AMJ/)).toBeInTheDocument();
    expect(screen.getByText(/2020/)).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });
});
