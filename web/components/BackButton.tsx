'use client';

import { useRouter } from 'next/navigation';

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="text-sm text-accent hover:underline mb-4 inline-block"
    >
      ← Back
    </button>
  );
}
