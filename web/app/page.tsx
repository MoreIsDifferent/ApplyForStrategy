import { FilterableFacultyList } from '@/components/FilterableFacultyList';
import { allFaculty } from '@/lib/sampleData';

export default function HomePage() {
  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Strategy PhD Faculty Finder</h1>
      <FilterableFacultyList faculty={allFaculty} />
    </main>
  );
}
