import Link from 'next/link';

export function SiteHeader() {
  return (
    <header>
      <div className="bg-navy">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/" className="block text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Match For Strategy
          </Link>
        </div>
      </div>
      <div className="bg-accent">
        <div className="max-w-7xl mx-auto px-6 py-1.5">
          <p className="text-xs sm:text-sm text-white">Discover your academic fit for Strategy PhD Applications</p>
        </div>
      </div>
    </header>
  );
}
