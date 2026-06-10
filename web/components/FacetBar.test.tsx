import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacetBar } from './FacetBar';
import { EMPTY_FILTERS } from '@/lib/filtering';

describe('FacetBar', () => {
  it('renders one column per facet definition', () => {
    render(
      <FacetBar
        facetDefinitions={[
          { field: 'topics', title: 'Topic', options: ['Innovation'] },
          { field: 'theories', title: 'Theory', options: ['RBV'] },
        ]}
        filters={EMPTY_FILTERS}
        counts={{ topics: { Innovation: 1 }, theories: { RBV: 1 }, methodology: {}, geography: {} }}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText('Topic')).toBeInTheDocument();
    expect(screen.getByText('Theory')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Innovation/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /RBV/ })).toBeInTheDocument();
  });
});
