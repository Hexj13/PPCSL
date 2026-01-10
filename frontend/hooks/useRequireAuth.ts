import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuthStore } from '@/lib/store';

interface UseRequireAuthOptions {
  redirectTo?: string;
  requiredRole?: 'Admin' | 'Business' | 'Individual';
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { redirectTo = '/login', requiredRole } = options;
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && !user) {
      router.push(redirectTo);
      return;
    }

    if (requiredRole && user && user.type !== requiredRole) {
      router.push('/');
    }
  }, [user, isInitialized, router, redirectTo, requiredRole]);

  const isLoading = !isInitialized;
  const isAuthorized = isInitialized && !!user && (!requiredRole || user.type === requiredRole);

  return { user, isLoading, isAuthorized };
}
