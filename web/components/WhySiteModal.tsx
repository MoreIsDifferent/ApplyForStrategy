'use client';

import { useState } from 'react';

export function WhySiteModal() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 px-4 py-8">
      <div className="bg-accent-soft/95 border border-accent-soft rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-full overflow-y-auto">
        <h2 className="text-xl font-extrabold tracking-tight text-navy mb-3">Why this site?</h2>
        <div className="flex flex-col gap-4 text-[15px] font-medium text-charcoal leading-relaxed">
          <p>
            In our experience, academic fit is one of the most critical factors in a successful Strategy PhD
            application—and finding that fit begins with identifying faculty whose research genuinely aligns with
            your interests. This platform is designed to streamline that pivotal step. By surfacing structured,
            granular insights into faculty research, we hope to help applicants more effectively collect information
            and to foster better matches between prospective students and doctoral programs. We believe that better
            matches empower applicants to discover the right choices for their academic journey, while ensuring
            programs attract candidates who are a strong fit.
          </p>
          <p className="text-navy">
            This site was built as a collaborative effort by Yi Hao and Isin Guler from the UNC Kenan-Flagler Business
            School. Yi Hao is a PhD student in Strategy and Entrepreneurship, and Isin Guler is a Professor of
            Strategy.
          </p>
          <p className="text-navy">
            We welcome your feedback to help improve this resource. If you have suggestions or data corrections,
            please contact Yi Hao{' '}
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
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-6 px-6 py-2 rounded-lg bg-accent text-white text-sm font-bold hover:bg-accent-soft-text transition-colors"
        >
          Start finding
        </button>
      </div>
    </div>
  );
}
