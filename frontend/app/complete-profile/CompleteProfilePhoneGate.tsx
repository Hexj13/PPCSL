'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { cancelOAuthPhoneRequiredSignup } from '@/app/complete-profile/oauthPhoneRequiredCancel';
import { useHistoryBackClose } from '@/hooks/useHistoryBackClose';
import { useTranslation } from '@/hooks/useTranslation';
import { MAIN_VIEWPORT_MIN_HEIGHT_CLASS } from '@/lib/constants';
import { getClientLocale } from '@/lib/i18n';
import {
  clearOAuthPhoneRequiredContext,
  isOAuthPhoneRequiredSignupFlow,
  shouldShowOAuthPhoneRequiredCancel,
} from '@/lib/oauth-phone-required-context';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { buildSignPageHref, getReturnUrlFromSearchParams } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';

import { PhoneRequiredStep } from './PhoneRequiredStep';

export function CompleteProfilePhoneGate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const returnUrl = getReturnUrlFromSearchParams(searchParams);
  const phoneRequiredMode = searchParams.get('mode') === 'phone_required';
  const source = searchParams.get('source');
  const isOAuthSignup = shouldShowOAuthPhoneRequiredCancel(source, user);
  const [cancelBusy, setCancelBusy] = useState(false);
  const shouldTrapBack = Boolean(user && phoneRequiredMode && !user.phoneVerified);

  const exitPhoneRequired = useCallback(
    async (options?: { dismissOverlay?: () => void }) => {
      if (cancelBusy) return;
      options?.dismissOverlay?.();
      setCancelBusy(true);
      const signHref = buildSignPageHref({ tab: 'login', returnUrl });
      try {
        if (isOAuthPhoneRequiredSignupFlow(source)) {
          await cancelOAuthPhoneRequiredSignup();
        }
        clearOAuthPhoneRequiredContext();
        logout();
        router.replace(signHref);
      } finally {
        setCancelBusy(false);
      }
    },
    [cancelBusy, logout, router, returnUrl, source],
  );

  const { dismissOverlay } = useHistoryBackClose(
    shouldTrapBack,
    () => void exitPhoneRequired({ dismissOverlay }),
    'complete-profile-phone-required',
  );

  useEffect(() => {
    if (!user) return;
    if (!phoneRequiredMode) return;
    if (user.phoneVerified && typeof window !== 'undefined' && window.location) {
      clearOAuthPhoneRequiredContext();
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
        <PhoneRequiredStep
          returnUrl={returnUrl}
          showOAuthCancel={isOAuthSignup}
          onOAuthCancel={() => void exitPhoneRequired({ dismissOverlay })}
          oauthCancelBusy={cancelBusy}
        />
      </div>
    </div>
  );
}
