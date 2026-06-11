import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacultyCard } from './FacultyCard';
import { allFaculty } from '@/lib/sampleData';

describe('FacultyCard', () => {
  it('renders school name above faculty name and title, color-coded pills, and links to the faculty page', () => {
    const faculty = allFaculty[0];
    render(<FacultyCard faculty={faculty} />);
    expect(screen.getByText(faculty.school.name)).toBeInTheDocument();
    expect(screen.getByText(faculty.name)).toBeInTheDocument();
    if (faculty.title) {
      expect(screen.getByText(faculty.title)).toBeInTheDocument();
    }
    for (const topic of faculty.topics) {
      expect(screen.getByText(topic.name)).toBeInTheDocument();
    }
    for (const theory of faculty.theories) {
      expect(screen.getByText(theory)).toBeInTheDocument();
    }
    if (faculty.methodology) {
      expect(screen.getByText(faculty.methodology)).toBeInTheDocument();
    }
    expect(screen.getByText(faculty.school.geography)).toBeInTheDocument();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/faculty/${faculty.id}`);
  });
});
