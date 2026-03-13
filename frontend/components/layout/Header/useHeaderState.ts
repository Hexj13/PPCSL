'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useCallback, startTransition, useEffect } from 'react';

import { useLoadingState } from '@/hooks/useLoadingState';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/lib/store';

const AUTH_PATHS = ['/login', '/register', '/verify-phone', '/reset-password'];

export function useHeaderState() {
  const { user, logout, isInitialized } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isErrorPage, setIsErrorPage] = useState(false);

  const { visible: loadingStateVisible } = useLoadingState({
    isLoading: !isInitialized,
    showDelay: 200,
    minDisplayTime: 1000,
  });
  const showSkeleton = !isInitialized || loadingStateVisible;

  const isAuthPage = AUTH_PATHS.includes(pathname);

  useEffect(() => {
    setIsErrorPage(document.querySelector('[data-error-page="true"]') !== null);
  }, [pathname]);

  const handleLogout = useCallback(() => {
    startTransition(() => {
      logout();
      setIsMobileMenuOpen(false);
      router.replace('/');
    });
  }, [logout, router]);

  const handleMobileMenuToggle = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const handleMobileMenuClose = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleSetReturnUrl = useCallback((url: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('returnUrl', url);
    }
  }, []);

  const navLinkClasses =
    'text-primary-900 font-medium text-sm hover-only:hover:text-primary-700 active:text-primary-700 transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 md:gap-2 px-1.5 md:px-2 py-1.5 rounded-sm select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base';

  const mobileNavLinkClasses =
    'text-primary-900 text-[14px] font-medium hover-only:hover:text-primary-700 active:text-primary-700 transition-colors duration-200 py-2 pl-4 flex items-center gap-2 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base';

  const showNav = !isAuthPage && !isErrorPage;

  return {
    user,
    isInitialized,
    showSkeleton,
    isAuthPage,
    isErrorPage,
    showNav,
    isMobileMenuOpen,
    handleLogout,
    handleMobileMenuToggle,
    handleMobileMenuClose,
    handleSetReturnUrl,
    navLinkClasses,
    mobileNavLinkClasses,
    t,
  };
}
