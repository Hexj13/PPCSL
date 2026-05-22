'use client';

import { usePathname } from 'next/navigation';
import { useState, useCallback, startTransition, useEffect } from 'react';

import {
  isAuthRequiredPathname,
  isAuthRoutePathname,
  isSignRoutePathname,
} from '@/components/layout/header-flow-paths';
import { useTranslation } from '@/hooks/useTranslation';
import { getClientLocale } from '@/lib/i18n';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { buildSignInHref } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';

export function useHeaderState() {
  const { user, logout, isInitialized } = useAuthStore();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isErrorPage, setIsErrorPage] = useState(false);

  const showSkeleton = !isInitialized && !user;

  const isAuthPage = isAuthRoutePathname(pathname);

  useEffect(() => {
    setIsErrorPage(document.querySelector('[data-error-page="true"]') !== null);
  }, [pathname]);

  const handleLogout = useCallback(() => {
    const redirectHome = isAuthRequiredPathname(pathname);
    startTransition(() => {
      logout();
      setIsMobileMenuOpen(false);
      if (redirectHome && typeof window !== 'undefined') {
        window.location.href = buildPostAuthRedirect('/', getClientLocale());
      }
    });
  }, [logout, pathname]);

  const handleMobileMenuToggle = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const handleMobileMenuClose = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleSetReturnUrl = useCallback((url: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = buildSignInHref(url);
    }
  }, []);

  const navLinkClasses =
    'text-primary-900 font-medium text-sm hover-only:hover:text-primary-700 active:text-primary-700 transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 md:gap-2 px-1.5 md:px-2 py-1.5 rounded-sm select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base';

  const mobileNavLinkClasses =
    'text-primary-900 text-[14px] font-medium hover-only:hover:text-primary-700 active:text-primary-700 transition-colors duration-200 py-2 pl-4 flex items-center gap-2 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base';

  const showNav = !isErrorPage && (!isAuthPage || isSignRoutePathname(pathname));

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
