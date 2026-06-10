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
    const categoryCount = allFaculty.filter((f) =>
      f.topics.some((t) => t.category === 'Innovation & Technology')
    ).length;
    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(`Innovation & Technology \\(${categoryCount}\\)`) })
    );
    expect(screen.getByText(`${categoryCount} results`)).toBeInTheDocument();
  });

  it('narrows results further when a specific topic within an expanded category is selected', async () => {
    render(<FilterableFacultyList faculty={allFaculty} />);
    await userEvent.click(screen.getByRole('button', { name: /Toggle Corporate Strategy & Governance/i }));
    const count = allFaculty.filter((f) => f.topics.some((t) => t.name === 'M&A')).length;
    await userEvent.click(screen.getByRole('button', { name: new RegExp(`^M&A \\(${count}\\)`) }));
    expect(screen.getByText(`${count} results`)).toBeInTheDocument();
  });

  it('narrows results when a methodology facet is selected', async () => {
    render(<FilterableFacultyList faculty={allFaculty} />);
    const methodologyValue = allFaculty[0].methodology;
    if (!methodologyValue) throw new Error('Test fixture allFaculty[0] must have a methodology');
    const count = allFaculty.filter((f) => f.methodology === methodologyValue).length;
    const escaped = methodologyValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(`^${escaped} \\(${count}\\)`) })
    );
    expect(screen.getByText(`${count} results`)).toBeInTheDocument();
  });
});
