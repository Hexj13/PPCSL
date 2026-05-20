import { useRouter } from 'next/navigation';
import { useLayoutEffect } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { localizedHref } from '@/lib/localized-href';
import { buildSignInHref } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';

interface UseRequireAuthOptions {
  redirectTo?: string;
  signReturnPath?: string;
  requiredRole?: 'Admin' | 'Business' | 'Individual';
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { redirectTo = '/sign', signReturnPath, requiredRole } = options;
  const router = useRouter();
  const { locale } = useI18n();
  const { user, isInitialized } = useAuthStore();

  useLayoutEffect(() => {
    if (isInitialized && !user) {
      const target = signReturnPath
        ? buildSignInHref(signReturnPath, locale)
        : redirectTo === '/sign'
          ? buildSignInHref(undefined, locale)
          : localizedHref(redirectTo, locale);
      router.replace(target);
      return;
    }

    if (requiredRole && user && user.type !== requiredRole) {
      router.replace(localizedHref('/', locale));
    }
  }, [user, isInitialized, router, redirectTo, signReturnPath, requiredRole, locale]);

  const isLoading = !isInitialized;
  const isAuthorized = isInitialized && !!user && (!requiredRole || user.type === requiredRole);

  return { user, isLoading, isAuthorized, isInitialized };
}
