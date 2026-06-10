import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopicFacet } from './TopicFacet';

const groups = [
  { category: 'Corporate Strategy & Governance', topics: ['Corporate Strategy', 'M&A'] },
  { category: 'Innovation & Technology', topics: ['Innovation'] },
];

const counts = {
  'Corporate Strategy & Governance': 3,
  'Corporate Strategy': 2,
  'M&A': 2,
  'Innovation & Technology': 2,
  Innovation: 2,
};

describe('TopicFacet', () => {
  it('renders categories collapsed by default with counts', () => {
    render(<TopicFacet groups={groups} counts={counts} selected={[]} onToggle={() => {}} />);
    expect(screen.getByText('Corporate Strategy & Governance')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
    expect(screen.queryByText('M&A')).not.toBeInTheDocument();
  });

  it('expands a category to reveal its topics', async () => {
    render(<TopicFacet groups={groups} counts={counts} selected={[]} onToggle={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /Toggle Corporate Strategy & Governance/i }));
    expect(screen.getByText('M&A')).toBeInTheDocument();
    expect(screen.getByText('Corporate Strategy')).toBeInTheDocument();
  });

  it('calls onToggle with the category name when its checkbox is clicked', async () => {
    const onToggle = vi.fn();
    render(<TopicFacet groups={groups} counts={counts} selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Corporate Strategy & Governance/i }));
    expect(onToggle).toHaveBeenCalledWith('Corporate Strategy & Governance');
  });

  it('calls onToggle with the topic name when an expanded topic checkbox is clicked', async () => {
    const onToggle = vi.fn();
    render(<TopicFacet groups={groups} counts={counts} selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /Toggle Corporate Strategy & Governance/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: /^M&A/i }));
    expect(onToggle).toHaveBeenCalledWith('M&A');
  });

  it('hides categories with zero count', () => {
    const zeroCounts = { ...counts, 'Innovation & Technology': 0, Innovation: 0 };
    render(<TopicFacet groups={groups} counts={zeroCounts} selected={[]} onToggle={() => {}} />);
    expect(screen.queryByText('Innovation & Technology')).not.toBeInTheDocument();
  });
});
