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
    expect(screen.getByRole('button', { name: 'Corporate Strategy & Governance (3)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^M&A/ })).not.toBeInTheDocument();
  });

  it('expands a category to reveal its topics', async () => {
    render(<TopicFacet groups={groups} counts={counts} selected={[]} onToggle={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /Toggle Corporate Strategy & Governance/i }));
    expect(screen.getByRole('button', { name: 'M&A (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Corporate Strategy (2)' })).toBeInTheDocument();
  });

  it('calls onToggle with the category name when the category pill is clicked', async () => {
    const onToggle = vi.fn();
    render(<TopicFacet groups={groups} counts={counts} selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Corporate Strategy & Governance (3)' }));
    expect(onToggle).toHaveBeenCalledWith('Corporate Strategy & Governance');
  });

  it('does not call onToggle when the expand indicator is clicked', async () => {
    const onToggle = vi.fn();
    render(<TopicFacet groups={groups} counts={counts} selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /Toggle Corporate Strategy & Governance/i }));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('calls onToggle with the topic name when an expanded sub-topic pill is clicked', async () => {
    const onToggle = vi.fn();
    render(<TopicFacet groups={groups} counts={counts} selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /Toggle Corporate Strategy & Governance/i }));
    await userEvent.click(screen.getByRole('button', { name: 'M&A (2)' }));
    expect(onToggle).toHaveBeenCalledWith('M&A');
  });

  it('hides categories with zero count', () => {
    const zeroCounts = { ...counts, 'Innovation & Technology': 0, Innovation: 0 };
    render(<TopicFacet groups={groups} counts={zeroCounts} selected={[]} onToggle={() => {}} />);
    expect(screen.queryByRole('button', { name: /Innovation & Technology/ })).not.toBeInTheDocument();
  });
});
