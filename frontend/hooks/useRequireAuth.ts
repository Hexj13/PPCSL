import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { localizedHref } from '@/lib/localized-href';
import { buildSignInHref } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';

interface UseRequireAuthOptions {
  redirectTo?: string;
  requiredRole?: 'Admin' | 'Business' | 'Individual';
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { redirectTo = '/sign', requiredRole } = options;
  const router = useRouter();
  const { locale } = useI18n();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && !user) {
      const target = redirectTo === '/sign' ? buildSignInHref() : localizedHref(redirectTo, locale);
      router.push(target);
      return;
    }

    if (requiredRole && user && user.type !== requiredRole) {
      router.push(localizedHref('/', locale));
    }
  }, [user, isInitialized, router, redirectTo, requiredRole, locale]);

  const isLoading = !isInitialized;
  const isAuthorized = isInitialized && !!user && (!requiredRole || user.type === requiredRole);

  return { user, isLoading, isAuthorized };
}
