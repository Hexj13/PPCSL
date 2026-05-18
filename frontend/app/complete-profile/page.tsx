'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { MAIN_VIEWPORT_MIN_HEIGHT_CLASS } from '@/lib/constants';
import { getClientLocale } from '@/lib/i18n';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { useAuthStore } from '@/lib/store';

import { CompleteProfileBusinessOnboarding } from './CompleteProfileBusinessOnboarding';
import { CompleteProfilePhoneGate } from './CompleteProfilePhoneGate';
import { CompleteProfileStandardFlow } from './CompleteProfileStandardFlow';

function CompleteProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isInitialized } = useAuthStore();
  const phoneRequiredMode = searchParams.get('mode') === 'phone_required';
  const businessOnboardingMode = searchParams.get('mode') === 'business_onboarding';

  useEffect(() => {
    if (isInitialized && !user) {
      router.push(buildPostAuthRedirect('/sign', getClientLocale()));
    }
  }, [user, isInitialized, router]);

  if (!isInitialized || !user) {
    return (
      <div
        className={`max-w-md mx-auto mt-6 md:mt-12 mb-16 ${MAIN_VIEWPORT_MIN_HEIGHT_CLASS}`}
        aria-hidden
      />
    );
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
  return (
    <div
      className={`max-w-md mx-auto mt-6 md:mt-12 mb-16 ${MAIN_VIEWPORT_MIN_HEIGHT_CLASS}`}
      aria-hidden
    />
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<CompleteProfileSuspenseFallback />}>
      <CompleteProfileContent />
    </Suspense>
  );
}
