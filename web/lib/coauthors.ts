import type { Faculty } from './types';

const MAX_COAUTHORS = 5;

export function getSampleCoauthors(faculty: Faculty, allFaculty: Faculty[]): Faculty[] {
  const topicNames = new Set(faculty.topics.map((t) => t.name));
  const theoryNames = new Set(faculty.theories);

  return allFaculty
    .filter((f) => f.id !== faculty.id)
    .map((f) => {
      let score = 0;
      for (const t of f.topics) if (topicNames.has(t.name)) score += 2;
      for (const th of f.theories) if (theoryNames.has(th)) score += 1;
      if (f.school.id === faculty.school.id) score += 1;
      if (f.methodology && f.methodology === faculty.methodology) score += 1;
      return { faculty: f, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.faculty.name.localeCompare(b.faculty.name))
    .slice(0, MAX_COAUTHORS)
    .map((entry) => entry.faculty);
}
