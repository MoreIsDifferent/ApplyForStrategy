import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacultyCard } from './FacultyCard';
import { allFaculty } from '@/lib/sampleData';

describe('FacultyCard', () => {
  it('renders faculty name, title/school line, topic pills, methodology, and links to the faculty page', () => {
    const faculty = allFaculty[0];
    render(<FacultyCard faculty={faculty} />);
    expect(screen.getByText(faculty.name)).toBeInTheDocument();
    const link = screen.getByRole('link');
    if (faculty.title) {
      expect(link).toHaveTextContent(`${faculty.title} — ${faculty.school.name}`);
    } else {
      expect(screen.getByText(faculty.school.name)).toBeInTheDocument();
    }
    for (const topic of faculty.topics) {
      expect(screen.getByText(topic.name)).toBeInTheDocument();
    }
    if (faculty.methodology) {
      expect(screen.getByText(`Methodology: ${faculty.methodology}`)).toBeInTheDocument();
    }
    expect(link).toHaveAttribute('href', `/faculty/${faculty.id}`);
  });
});
