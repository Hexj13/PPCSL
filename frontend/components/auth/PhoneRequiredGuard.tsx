'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { getClientLocale } from '@/lib/i18n';
import { isPhoneVerificationExemptRestPath } from '@/lib/phone-verification-paths';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { useAuthStore } from '@/lib/store';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

export function PhoneRequiredGuard() {
  const pathname = usePathname();
  const { replace } = useLocalizedNavigation();
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    if (!isInitialized || !user) return;
    if (user.phoneVerified) return;
    const { restPath } = stripLocalePrefixFromPathname(pathname);
    if (isPhoneVerificationExemptRestPath(restPath)) return;
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const returnTarget = `${pathname}${search}`;
    replace(
      buildPostAuthRedirect(
        `/complete-profile?mode=phone_required&returnUrl=${encodeURIComponent(returnTarget)}`,
        getClientLocale(),
      ),
    );
  }, [isInitialized, user, pathname, replace]);

  return null;
}
