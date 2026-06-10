import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortfolioChart } from './PortfolioChart';

describe('PortfolioChart', () => {
  it('shows a message when there is no data', () => {
    render(<PortfolioChart data={[]} />);
    expect(screen.getByText('No topic data available.')).toBeInTheDocument();
  });

  it('renders an svg pie chart when data is present', () => {
    const { container } = render(
      <PortfolioChart
        data={[
          { topic: 'Innovation', count: 3, percentage: 60 },
          { topic: 'M&A', count: 2, percentage: 40 },
        ]}
      />
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
