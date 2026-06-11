import { FilterableFacultyList } from '@/components/FilterableFacultyList';
import { getAllFaculty } from '@/lib/data';

export default async function HomePage() {
  const allFaculty = await getAllFaculty();
  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <section className="bg-accent-soft/60 border border-accent-soft rounded-2xl p-6 mb-6 mt-6">
        <h2 className="text-xl font-extrabold tracking-tight text-navy mb-3">Why this site?</h2>
        <div className="flex flex-col gap-4 text-[15px] text-charcoal leading-relaxed">
          <p>
            In our experience, fit with a program is one of the most important factors in a successful Strategy PhD
            application — and finding fit starts with finding faculty whose research genuinely interests you. This
            site is meant to help with that step: by surfacing more information about faculty research, we hope to
            help applicants and programs find better matches. Better matches mean applicants are more likely to find
            programs that are right for them and less likely to lose out due to poor fit, while programs are more
            likely to see applicants who are a strong match for their faculty.
          </p>
          <p className="text-navy">
            This site was built by Yi Hao{' '}
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
            </a>{' '}
            &amp; Isin Guler. Yi Hao is a PhD student in Strategy and Entrepreneurship at UNC Kenan-Flagler, and Isin
            is a Professor of Strategy at UNC Kenan-Flagler. If you have suggestions, please contact Yi Hao.
          </p>
        </div>
      </section>
      <FilterableFacultyList faculty={allFaculty} />
    </main>
  );
}
