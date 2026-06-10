import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterableFacultyList } from './FilterableFacultyList';
import { allFaculty } from '@/lib/sampleData';

describe('FilterableFacultyList', () => {
  it('shows all faculty by default', () => {
    render(<FilterableFacultyList faculty={allFaculty} />);
    expect(screen.getByText(`${allFaculty.length} results`)).toBeInTheDocument();
  });

  it('narrows results when a topic category facet is selected', async () => {
    render(<FilterableFacultyList faculty={allFaculty} />);
    const count = allFaculty.filter((f) =>
      f.topics.some((t) => t.category === 'Innovation & Technology')
    ).length;
    await userEvent.click(screen.getByRole('checkbox', { name: /Innovation & Technology/i }));
    expect(screen.getByText(`${count} results`)).toBeInTheDocument();
  });

  it('narrows results further when a specific topic within an expanded category is selected', async () => {
    render(<FilterableFacultyList faculty={allFaculty} />);
    await userEvent.click(screen.getByRole('button', { name: /Toggle Corporate Strategy & Governance/i }));
    const count = allFaculty.filter((f) => f.topics.some((t) => t.name === 'M&A')).length;
    await userEvent.click(screen.getByRole('checkbox', { name: /^M&A/i }));
    expect(screen.getByText(`${count} results`)).toBeInTheDocument();
  });
});
