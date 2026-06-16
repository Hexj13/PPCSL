'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useAuthStore } from '@/lib/store';

import { CompleteProfileBusinessOnboarding } from './CompleteProfileBusinessOnboarding';
import { CompleteProfilePageLoader } from './CompleteProfilePageLoader';
import { CompleteProfilePhoneGate } from './CompleteProfilePhoneGate';
import { CompleteProfileStandardFlow } from './CompleteProfileStandardFlow';

function CompleteProfileContent() {
  const { replace } = useLocalizedNavigation();
  const searchParams = useSearchParams();
  const { user, isInitialized } = useAuthStore();
  const phoneRequiredMode = searchParams.get('mode') === 'phone_required';
  const businessOnboardingMode = searchParams.get('mode') === 'business_onboarding';

  useEffect(() => {
    if (isInitialized && !user) {
      replace('/sign');
    }
  }, [user, isInitialized, replace]);

  if (!isInitialized || !user) {
    return <CompleteProfilePageLoader />;
  }

  if (businessOnboardingMode) {
    return <CompleteProfileBusinessOnboarding />;
  }

  if (phoneRequiredMode && !user.phoneVerified) {
    return <CompleteProfilePhoneGate />;
  }

  return <CompleteProfileStandardFlow user={user} />;
}

function CompleteProfileSuspenseFallback() {
  return <CompleteProfilePageLoader />;
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<CompleteProfileSuspenseFallback />}>
      <CompleteProfileContent />
    </Suspense>
  );
}
