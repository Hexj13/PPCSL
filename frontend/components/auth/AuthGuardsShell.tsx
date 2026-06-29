'use client';

import type { ReactNode } from 'react';

import { useAuthStore } from '@/lib/store';

import { BusinessOnboardingGuard } from './BusinessOnboardingGuard';
import { PhoneRequiredGuard } from './PhoneRequiredGuard';

export function AuthGuardsShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  return (
    <>
      {children}
      {isInitialized && user ? (
        <>
          <BusinessOnboardingGuard />
          <PhoneRequiredGuard />
        </>
      ) : null}
    </>
  );
}
