import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublicationList } from './PublicationList';
import type { Publication } from '@/lib/types';

const pubs: Publication[] = [
  { title: 'Paper A', journal: 'AMJ', year: 2020, citation_count: 50 },
];

const pubNoMeta: Publication[] = [
  { title: 'Paper B', journal: null, year: null, citation_count: 0 },
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

  it('omits journal and year when absent', () => {
    render(<PublicationList publications={pubNoMeta} />);
    expect(screen.getByText('Paper B')).toBeInTheDocument();
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
    expect(screen.getByText(/0 citations/)).toBeInTheDocument();
  });
});
