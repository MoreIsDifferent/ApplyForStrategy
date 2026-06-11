import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacultyCard } from './FacultyCard';
import { allFaculty } from '@/lib/sampleData';

describe('FacultyCard', () => {
  it('renders faculty name/title/pills linking to the faculty page and a school icon+name linking to the school page', () => {
    const faculty = allFaculty[0];
    render(<FacultyCard faculty={faculty} />);
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
    expect(screen.getByText(faculty.school.name)).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    expect(links.find((l) => l.getAttribute('href') === `/faculty/${faculty.id}`)).toBeTruthy();
    expect(links.find((l) => l.getAttribute('href') === `/schools/${faculty.school.slug}`)).toBeTruthy();
  });
});
