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

  const { visible: showSkeleton } = useLoadingState({
    isLoading: !isInitialized,
    showDelay: 200,
    minDisplayTime: 1000,
  });

  const isAuthPage = AUTH_PATHS.includes(pathname);

  useEffect(() => {
    setIsErrorPage(document.querySelector('[data-error-page="true"]') !== null);
  }, []);

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
    'text-white font-medium text-xs md:text-xs lg:text-sm xl:text-sm hover:text-primary-100 active:text-primary-300 transition-all duration-200 whitespace-nowrap flex items-center gap-1 md:gap-1.5 px-1 md:px-1.5 py-1 md:py-1.5 rounded select-none';

  const mobileNavLinkClasses =
    'text-white font-medium hover:text-primary-100 active:text-primary-300 transition-colors duration-200 py-2 pl-4 flex items-center gap-2 select-none';

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
