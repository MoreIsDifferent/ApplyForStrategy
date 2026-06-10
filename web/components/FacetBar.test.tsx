import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacetBar } from './FacetBar';
import { EMPTY_FILTERS } from '@/lib/filtering';

describe('FacetBar', () => {
  it('renders one column per facet definition inside a card', () => {
    const { container } = render(
      <FacetBar
        facetDefinitions={[
          { field: 'theories', title: 'Theory', options: ['RBV'], colorScheme: 'theory' },
          { field: 'methodology', title: 'Methodology', options: ['Quantitative'], colorScheme: 'method' },
        ]}
        filters={EMPTY_FILTERS}
        counts={{ topics: {}, theories: { RBV: 1 }, methodology: { Quantitative: 1 }, geography: {} }}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText('Theory')).toBeInTheDocument();
    expect(screen.getByText('Methodology')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RBV (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quantitative (1)' })).toBeInTheDocument();
    expect(container.querySelector('.bg-white')).toBeInTheDocument();
  });
});
