'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import {
  isBusinessOnboardingGateExemptRestPath,
  requiresBusinessCompanyOnboarding,
} from '@/lib/business-onboarding-gate';
import { getClientLocale } from '@/lib/i18n';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { useAuthStore } from '@/lib/store';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

export function BusinessOnboardingGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { replace } = useLocalizedNavigation();
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    if (!isInitialized || !user) return;
    if (!requiresBusinessCompanyOnboarding(user)) return;

    const { restPath } = stripLocalePrefixFromPathname(pathname);
    if (isBusinessOnboardingGateExemptRestPath(restPath)) return;

    if (restPath.startsWith('/complete-profile')) {
      const mode = searchParams.get('mode');
      if (mode === 'business_onboarding') return;
    }

    const search = typeof window !== 'undefined' ? window.location.search : '';
    const returnTarget = `${pathname}${search}`;
    replace(
      buildPostAuthRedirect(
        `/complete-profile?mode=business_onboarding&returnUrl=${encodeURIComponent(returnTarget)}`,
        getClientLocale(),
      ),
    );
  }, [isInitialized, user, pathname, replace, searchParams]);

  return <>{children}</>;
}
