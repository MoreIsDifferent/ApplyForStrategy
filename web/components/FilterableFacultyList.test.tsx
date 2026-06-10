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

  it('narrows results when a topic facet is selected', async () => {
    render(<FilterableFacultyList faculty={allFaculty} />);
    const innovationCount = allFaculty.filter((f) => f.topics.includes('Innovation')).length;
    await userEvent.click(screen.getByRole('checkbox', { name: /Innovation/i }));
    expect(screen.getByText(`${innovationCount} results`)).toBeInTheDocument();
  });
});
