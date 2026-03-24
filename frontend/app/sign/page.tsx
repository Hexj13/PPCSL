'use client';

import { Suspense } from 'react';

import { SignPageContent } from './SignPageContent';

function SignFallback() {
  return <div className="max-w-md mx-auto mt-6 md:mt-12 mb-16 min-h-[320px]" aria-hidden />;
}

export default function SignPage() {
  return (
    <Suspense fallback={<SignFallback />}>
      <SignPageContent />
    </Suspense>
  );
}
