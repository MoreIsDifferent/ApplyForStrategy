import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllFaculty } from '@/lib/data';

export async function generateStaticParams() {
  const allFaculty = await getAllFaculty();
  return allFaculty.map((f) => ({ id: f.id }));
}

export default async function FacultyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const allFaculty = await getAllFaculty();
  const faculty = allFaculty.find((f) => f.id === id);
  if (!faculty) {
    notFound();
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <Link href="/" className="text-sm text-blue-600 underline mb-4 inline-block">
        ← Back to all faculty
      </Link>
      <h1 className="text-2xl font-bold mb-1">{faculty.name}</h1>
      <p className="text-gray-500 mb-4">
        {faculty.title} — {faculty.school.name}
      </p>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="font-semibold">PhD Institution</dt>
          <dd>{faculty.phd_institution ?? 'Unknown'}</dd>
        </div>
        <div>
          <dt className="font-semibold">Methodology</dt>
          <dd>{faculty.methodology ?? 'Unknown'}</dd>
        </div>
        <div>
          <dt className="font-semibold">Research Topics</dt>
          <dd>{faculty.topics.length > 0 ? faculty.topics.map((t) => t.name).join(', ') : 'Unknown'}</dd>
        </div>
        <div>
          <dt className="font-semibold">Theories</dt>
          <dd>{faculty.theories.length > 0 ? faculty.theories.join(', ') : 'Unknown'}</dd>
        </div>
      </dl>
      <div className="flex gap-4 mt-4 text-sm">
        {faculty.school_profile_url && (
          <a className="text-blue-600 underline" href={faculty.school_profile_url}>
            School Profile
          </a>
        )}
        {faculty.personal_website_url && (
          <a className="text-blue-600 underline" href={faculty.personal_website_url}>
            Personal Website
          </a>
        )}
        {faculty.google_scholar_url && (
          <a className="text-blue-600 underline" href={faculty.google_scholar_url}>
            Google Scholar
          </a>
        )}
      </div>
    </main>
  );
}
