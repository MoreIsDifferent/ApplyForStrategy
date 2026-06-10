import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacetColumn } from './FacetColumn';

describe('FacetColumn', () => {
  it('renders options with counts and reflects selection state', () => {
    render(
      <FacetColumn
        title="Methodology"
        colorScheme="method"
        options={['Quantitative', 'Qualitative']}
        counts={{ Quantitative: 40, Qualitative: 12 }}
        selected={['Quantitative']}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText('Methodology')).toBeInTheDocument();
    const selectedButton = screen.getByRole('button', { name: 'Quantitative (40)' });
    const unselectedButton = screen.getByRole('button', { name: 'Qualitative (12)' });
    expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
    expect(unselectedButton).toHaveAttribute('aria-pressed', 'false');
    expect(selectedButton.className).toContain('bg-method');
    expect(selectedButton.className).not.toContain('bg-method-soft');
    expect(unselectedButton.className).toContain('bg-method-soft');
  });

  it('calls onToggle with the clicked option value', async () => {
    const onToggle = vi.fn();
    render(
      <FacetColumn
        title="Methodology"
        colorScheme="method"
        options={['Quantitative', 'Qualitative']}
        counts={{ Quantitative: 40, Qualitative: 12 }}
        selected={[]}
        onToggle={onToggle}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Qualitative (12)' }));
    expect(onToggle).toHaveBeenCalledWith('Qualitative');
  });
});
