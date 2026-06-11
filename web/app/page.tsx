import { FilterableFacultyList } from '@/components/FilterableFacultyList';
import { getAllFaculty } from '@/lib/data';

export default async function HomePage() {
  const allFaculty = await getAllFaculty();
  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-charcoal">Strategy PhD Faculty Finder</h1>
      <p className="text-sm text-gray-secondary mt-1 mb-3">Browse strategy faculty across top business schools</p>
      <div className="bg-white border border-divider rounded-lg p-4 mb-6 text-sm text-charcoal leading-relaxed">
        <p className="mb-2">
          In our experience, fit with a program is one of the most important factors in a successful Strategy PhD
          application — and finding fit starts with finding faculty whose research genuinely interests you. This
          site is meant to help with that step: by surfacing more information about faculty research, we hope to
          help applicants and programs find better matches. Better matches mean applicants are more likely to find
          programs that are right for them and less likely to lose out due to poor fit, while programs are more
          likely to see applicants who are a strong match for their faculty.
        </p>
        <p>
          This site was built by Yi Hao &amp; Isin Guler. Yi Hao is a first-year PhD student in Strategy at UNC
          Kenan-Flagler, and Isin is a Professor of Strategy at UNC Kenan-Flagler. If you have suggestions, please
          contact Yi Hao at{' '}
          <a className="text-accent hover:underline" href="mailto:Yi_Hao@kenan-flagler.unc.edu">
            Yi_Hao@kenan-flagler.unc.edu
          </a>
          .
        </p>
      </div>
      <FilterableFacultyList faculty={allFaculty} />
    </main>
  );
}
