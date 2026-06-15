'use client';

import { Suspense } from 'react';

import { SignOAuthSkeletons } from './SignOAuthSkeletons';
import { SignPageContent } from './SignPageContent';

function SignFallback() {
  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12 mb-16" aria-hidden>
      <div className="min-h-[280px] rounded-lg bg-bg-secondary/20 animate-pulse" />
      <SignOAuthSkeletons />
    </div>
  );
}

export default function SignPage() {
  return (
    <Suspense fallback={<SignFallback />}>
      <SignPageContent />
    </Suspense>
  );
}
