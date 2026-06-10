import { FilterableFacultyList } from '@/components/FilterableFacultyList';
import { getAllFaculty } from '@/lib/data';

export default async function HomePage() {
  const allFaculty = await getAllFaculty();
  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-charcoal">Strategy PhD Faculty Finder</h1>
      <p className="text-sm text-gray-secondary mt-1 mb-6">Browse strategy faculty across top business schools</p>
      <FilterableFacultyList faculty={allFaculty} />
    </main>
  );
}
