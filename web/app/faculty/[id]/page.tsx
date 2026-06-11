import { notFound } from 'next/navigation';
import { getAllFaculty } from '@/lib/data';
import { getInitials } from '@/lib/initials';
import { getSampleCoauthors } from '@/lib/coauthors';
import { CoauthorGraph } from '@/components/CoauthorGraph';
import { BackButton } from '@/components/BackButton';

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

  const coauthors = getSampleCoauthors(faculty, allFaculty);

  return (
    <main className="max-w-2xl mx-auto px-6 py-8">
      <BackButton />

      <div className="flex items-center gap-4 mb-1">
        {faculty.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={faculty.photo_url}
            alt={faculty.name}
            className="w-16 h-16 rounded-full object-cover border border-divider"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
            {getInitials(faculty.name)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{faculty.name}</h1>
          <p className="text-sm text-gray-secondary">
            {faculty.title ? `${faculty.title} — ` : ''}{faculty.school.name}
          </p>
        </div>
      </div>

      <div className="bg-white border border-divider rounded-lg p-4 mt-4">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-1">PhD Institution</dt>
            <dd className="text-charcoal">{faculty.phd_institution ?? 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-1">Methodology</dt>
            <dd className="text-charcoal">{faculty.methodology ?? 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-1">Research Topics</dt>
            <dd className="flex flex-wrap gap-1.5">
              {faculty.topics.length > 0 ? (
                faculty.topics.map((t) => (
                  <span key={t.name} className="bg-accent-soft text-accent-soft-text rounded-full px-2.5 py-0.5 text-[11px]">{t.name}</span>
                ))
              ) : (
                <span className="text-charcoal">Unknown</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-1">Theories</dt>
            <dd className="text-charcoal">{faculty.theories.length > 0 ? faculty.theories.join(', ') : 'Unknown'}</dd>
          </div>
        </dl>
      </div>

      <div className="flex gap-4 mt-4 text-sm">
        {faculty.school_profile_url && (
          <a className="text-accent hover:underline" href={faculty.school_profile_url}>School Profile</a>
        )}
        {faculty.personal_website_url && (
          <a className="text-accent hover:underline" href={faculty.personal_website_url}>Personal Website</a>
        )}
        {faculty.google_scholar_url && (
          <a className="text-accent hover:underline" href={faculty.google_scholar_url}>Google Scholar</a>
        )}
      </div>

      {coauthors.length > 0 && (
        <div className="bg-white border border-divider rounded-lg p-4 mt-4">
          <h2 className="text-[11px] font-bold tracking-wide text-gray-secondary uppercase mb-3">
            Frequent Collaborators
          </h2>
          <CoauthorGraph faculty={faculty} coauthors={coauthors} />
        </div>
      )}
    </main>
  );
}
