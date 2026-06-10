import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacultyCard } from './FacultyCard';
import { allFaculty } from '@/lib/sampleData';

describe('FacultyCard', () => {
  it('renders faculty name, school, title, and topic/theory tags', () => {
    const faculty = allFaculty[0];
    render(<FacultyCard faculty={faculty} />);
    expect(screen.getByText(faculty.name)).toBeInTheDocument();
    expect(screen.getByText(faculty.school.name)).toBeInTheDocument();
    expect(screen.getByText(faculty.title)).toBeInTheDocument();
    for (const topic of faculty.topics) {
      expect(screen.getByText(topic.name)).toBeInTheDocument();
    }
  });
});
