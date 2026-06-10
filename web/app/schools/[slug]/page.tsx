import Link from 'next/link';
import { notFound } from 'next/navigation';
import { allFaculty, schools } from '@/lib/sampleData';
import { getTopicDistribution } from '@/lib/portfolio';
import { PortfolioChart } from '@/components/PortfolioChart';
import { ResultsList } from '@/components/ResultsList';

export function generateStaticParams() {
  return schools.map((school) => ({ slug: school.slug }));
}

export default async function SchoolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const school = schools.find((s) => s.slug === slug);
  if (!school) {
    notFound();
  }

  const facultyAtSchool = allFaculty.filter((f) => f.school.slug === school.slug);
  const distribution = getTopicDistribution(facultyAtSchool);

  return (
    <main className="max-w-5xl mx-auto p-6">
      <Link href="/" className="text-sm text-blue-600 underline mb-4 inline-block">
        ← Back to all faculty
      </Link>
      <h1 className="text-2xl font-bold mb-2">{school.name}</h1>
      <p className="text-gray-500 mb-6">{school.geography}</p>

      <h2 className="text-lg font-semibold mb-2">Research Portfolio</h2>
      <PortfolioChart data={distribution} />

      <h2 className="text-lg font-semibold mt-6 mb-2">Faculty</h2>
      <ResultsList faculty={facultyAtSchool} />
    </main>
  );
}
