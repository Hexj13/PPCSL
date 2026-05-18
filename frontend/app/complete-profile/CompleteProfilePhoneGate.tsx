'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { MAIN_VIEWPORT_MIN_HEIGHT_CLASS } from '@/lib/constants';
import { getClientLocale } from '@/lib/i18n';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { getReturnUrlFromSearchParams } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';

import { PhoneRequiredStep } from './PhoneRequiredStep';

export function CompleteProfilePhoneGate() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const returnUrl = getReturnUrlFromSearchParams(searchParams);
  const phoneRequiredMode = searchParams.get('mode') === 'phone_required';

  useEffect(() => {
    if (!user) return;
    if (!phoneRequiredMode) return;
    if (user.phoneVerified && typeof window !== 'undefined' && window.location) {
      window.location.href = buildPostAuthRedirect(returnUrl || '/', getClientLocale());
    }
  }, [user, phoneRequiredMode, returnUrl]);

  if (!user || !phoneRequiredMode || user.phoneVerified) {
    return null;
  }

  return (
    <div
      className={`w-full max-w-md mx-auto px-4 sm:px-6 md:px-0 mt-6 md:mt-12 mb-16 ${MAIN_VIEWPORT_MIN_HEIGHT_CLASS}`}
      data-testid="complete-profile-page"
    >
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center text-primary-900">
        {t('completeProfile.phoneRequiredTitle')}
      </h1>
      <div className="card p-5 sm:p-6 md:p-8">
        <PhoneRequiredStep returnUrl={returnUrl} />
      </div>
    </div>
  );
}
