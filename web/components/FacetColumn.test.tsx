import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacetColumn } from './FacetColumn';

describe('FacetColumn', () => {
  it('renders options with counts and reflects selection state', () => {
    render(
      <FacetColumn
        title="Topic"
        options={['Innovation', 'M&A']}
        counts={{ Innovation: 3, 'M&A': 1 }}
        selected={['Innovation']}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText('Topic')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Innovation/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /M&A/ })).not.toBeChecked();
  });

  it('calls onToggle with the clicked option value', async () => {
    const onToggle = vi.fn();
    render(
      <FacetColumn
        title="Topic"
        options={['Innovation', 'M&A']}
        counts={{ Innovation: 3, 'M&A': 1 }}
        selected={[]}
        onToggle={onToggle}
      />
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /M&A/ }));
    expect(onToggle).toHaveBeenCalledWith('M&A');
  });
});
