import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllFaculty, getSchools } from '@/lib/data';
import { getTopicDistribution } from '@/lib/portfolio';
import { getSchoolState } from '@/lib/schoolState';
import { PortfolioChart } from '@/components/PortfolioChart';
import { ResultsList } from '@/components/ResultsList';
import { USStateMap } from '@/components/USStateMap';

export async function generateStaticParams() {
  const schools = await getSchools();
  return schools.map((school) => ({ slug: school.slug }));
}

export default async function SchoolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const schools = await getSchools();
  const school = schools.find((s) => s.slug === slug);
  if (!school) {
    notFound();
  }

  const allFaculty = await getAllFaculty();
  const facultyAtSchool = allFaculty.filter((f) => f.school.slug === school.slug);
  const distribution = getTopicDistribution(facultyAtSchool);
  const state = getSchoolState(school.slug);

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/" className="text-sm text-accent hover:underline mb-4 inline-block">
        ← Back to all faculty
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-charcoal">{school.name}</h1>
        {state && (
          <div className="w-32 flex-shrink-0">
            <USStateMap highlightState={state} />
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-charcoal mb-2">Rankings</h2>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'UTD Top 100', value: school.ranking_utd },
          { label: 'TAMU', value: school.ranking_tamuga },
          { label: 'US News', value: school.ranking_usnews },
          { label: 'QS', value: school.ranking_qs },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-divider rounded-lg p-3 text-center">
            <dt className="text-[11px] uppercase tracking-wide text-gray-secondary">{label}</dt>
            <dd className="text-xl font-semibold text-charcoal">{value ?? '—'}</dd>
          </div>
        ))}
      </dl>

      <h2 className="text-lg font-semibold text-charcoal mb-2">Research Portfolio</h2>
      <div className="bg-white border border-divider rounded-lg p-4 mb-8">
        <PortfolioChart data={distribution} />
      </div>

      <h2 className="text-lg font-semibold text-charcoal mb-2">Faculty</h2>
      <ResultsList faculty={facultyAtSchool} />
    </main>
  );
}
