import { Suspense } from 'react';
import { FilterableFacultyList } from '@/components/FilterableFacultyList';
import { WhySiteModal } from '@/components/WhySiteModal';
import { getAllFaculty } from '@/lib/data';

export default async function HomePage() {
  const allFaculty = await getAllFaculty();
  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <WhySiteModal />
      <div className="mb-10 mt-6">
        <p className="font-display text-2xl sm:text-3xl text-navy leading-snug">
          Foster better matches between prospective students and doctoral programs.
        </p>
        <p className="text-[13px] text-gray-secondary mt-2">
          If you have suggestions or data corrections, please contact Yi Hao{' '}
          <a
            href="mailto:Yi_Hao@kenan-flagler.unc.edu"
            aria-label="Email Yi Hao"
            title="Email Yi Hao"
            className="inline-flex align-text-bottom text-accent hover:text-accent-soft-text"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </a>
          .
        </p>
      </div>
      <Suspense fallback={null}>
        <FilterableFacultyList faculty={allFaculty} />
      </Suspense>
    </main>
  );
}
