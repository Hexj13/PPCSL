'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import { useAuthStore } from '@/lib/store';

const PhoneRequiredGuard = dynamic(
  () => import('./PhoneRequiredGuard').then((m) => ({ default: m.PhoneRequiredGuard })),
  { ssr: false },
);

const BusinessOnboardingGuard = dynamic(
  () => import('./BusinessOnboardingGuard').then((m) => ({ default: m.BusinessOnboardingGuard })),
  { ssr: false },
);

export function AuthGuardsShell({ children }: { children: ReactNode }) {
  const { user, isInitialized } = useAuthStore();
  if (!isInitialized || !user) {
    return children;
  }
  return (
    <PhoneRequiredGuard>
      <BusinessOnboardingGuard>{children}</BusinessOnboardingGuard>
    </PhoneRequiredGuard>
  );
}
