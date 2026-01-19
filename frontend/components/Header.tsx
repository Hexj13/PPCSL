'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useCallback, startTransition, useEffect } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore, useComparisonStore } from '@/lib/store';

import { CreateListingButton } from './CreateListingButton';

export function Header() {
  const { user, logout, isInitialized } = useAuthStore();
  const comparisonCount = useComparisonStore((state) => state.count());
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  const isAuthPage = ['/login', '/register', '/verify-phone', '/reset-password'].includes(pathname);
  const [isErrorPage, setIsErrorPage] = useState(false);

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
    'text-white font-medium text-xs md:text-sm lg:text-sm xl:text-base hover:text-primary-100 active:text-primary-300 transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 md:gap-2 px-1.5 md:px-2 py-1.5 md:py-2 rounded select-none';

  const mobileNavLinkClasses =
    'text-white font-medium hover:text-primary-100 active:text-primary-300 transition-colors duration-200 py-2 pl-4 flex items-center gap-2 select-none';

  return (
    <header className="bg-primary-700 shadow-lg border-b-2 border-primary-500/20 sticky top-0 z-50 backdrop-blur-sm h-[72px]">
      <div className="container mx-auto px-3 sm:px-4 h-full">
        <div className="flex justify-between items-center h-full">
          <Link
            href="/"
            className="flex items-center hover:opacity-90 transition-opacity duration-200 select-none mr-4 lg:mr-6"
          >
            <Image
              src="/logo-desktop.svg"
              alt={t('header.brandName')}
              width={200}
              height={65}
              className="hidden lg:block h-8 md:h-10 w-auto"
              priority
            />
            <Image
              src="/logo-mobile.svg"
              alt={t('header.brandName')}
              width={150}
              height={48}
              className="lg:hidden h-8 w-auto"
              priority
            />
          </Link>

          {!isAuthPage && !isErrorPage && (
            <div className="flex items-center lg:hidden gap-3">
              {!isInitialized ? (
                <div className="h-9 w-20 bg-white/20 rounded animate-pulse" />
              ) : (
                !isMobileMenuOpen && <CreateListingButton variant="mobile" />
              )}
              <button
                onClick={handleMobileMenuToggle}
                className="lg:hidden text-primary-300  transition-colors duration-200 p-2 select-none"
                aria-label={t('header.toggleMenu')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          )}

          <nav className="hidden lg:flex gap-2 lg:gap-3 xl:gap-6 items-center">
            {!isInitialized ? (
              <div className="flex gap-4 items-center">
                <div className="h-9 w-24 bg-white/20 rounded animate-pulse" />
                <div className="h-9 w-32 bg-white/20 rounded animate-pulse" />
              </div>
            ) : user ? (
              <>
                <CreateListingButton variant="desktop" />
                <Link href="/my-listings" className={navLinkClasses}>
                  <svg
                    className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="hidden xl:inline">{t('header.myListings')}</span>
                  <span className="xl:hidden">{t('header.myListingsShort')}</span>
                </Link>
                <Link href="/favorites" className={navLinkClasses}>
                  <svg
                    className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <span className="hidden lg:inline">{t('header.favorites')}</span>
                  <span className="lg:hidden">{t('header.favorites')}</span>
                </Link>
                <Link href="/compare" className={navLinkClasses}>
                  <svg
                    className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                    />
                  </svg>
                  <span className="hidden lg:inline">{t('header.compare')}</span>
                  <span className="lg:hidden">{t('header.compare')}</span>
                  {comparisonCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500 border border-primary-300 text-white text-xs">
                      {comparisonCount}
                    </span>
                  )}
                </Link>
                {user.type === 'Admin' && (
                  <Link href="/admin" className={navLinkClasses}>
                    <svg
                      className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    <span className="hidden lg:inline">{t('header.admin')}</span>
                    <span className="lg:hidden">{t('header.admin')}</span>
                  </Link>
                )}
                <Link href="/profile" className={navLinkClasses}>
                  <svg
                    className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span>{t('header.profile')}</span>
                </Link>
                <button onClick={handleLogout} className={navLinkClasses}>
                  <svg
                    className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span className="hidden xl:inline">{t('header.logout')}</span>
                  <span className="xl:hidden">{t('header.logoutShort')}</span>
                </button>
              </>
            ) : (
              <>
                {!isAuthPage && !isErrorPage && <CreateListingButton variant="desktop" />}
                {!isAuthPage && !isErrorPage && (
                  <>
                    <Link
                      href="/login"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          const currentUrl = window.location.pathname + window.location.search;
                          if (currentUrl !== '/login' && currentUrl !== '/register') {
                            handleSetReturnUrl(currentUrl);
                          }
                        }
                      }}
                      className="text-white font-medium text-xs md:text-sm lg:text-sm xl:text-base hover:text-primary-100 active:text-primary-300 transition-all duration-200 whitespace-nowrap flex items-center gap-2 md:gap-2.5 px-2.5 md:px-3 lg:px-3 xl:px-4 py-2 md:py-2.5 rounded-lg border-2 border-primary-300 active:border-primary-500 select-none"
                    >
                      <span className="hidden xl:inline">{t('header.login')}</span>
                      <span className="xl:hidden">{t('header.loginShort')}</span>
                    </Link>
                    <Link
                      href="/register"
                      className="text-white font-medium text-xs md:text-sm lg:text-sm xl:text-base hover:text-primary-100 active:text-primary-300 transition-all duration-200 whitespace-nowrap flex items-center gap-2 md:gap-2.5 px-2.5 md:px-3 lg:px-3 xl:px-4 py-2 md:py-2.5 rounded-lg border-2 border-primary-300 active:border-primary-500 select-none"
                    >
                      {t('header.register')}
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
      </div>

      {isMobileMenuOpen && !isAuthPage && !isErrorPage && (
        <nav className="lg:hidden pb-4 pt-4 bg-primary-700 w-full">
          <div className="container mx-auto px-3 sm:px-4">
            {!isInitialized ? (
              <div className="flex flex-col gap-3">
                <div className="h-10 bg-white/20 rounded animate-pulse" />
                <div className="h-10 bg-white/20 rounded animate-pulse" />
              </div>
            ) : user ? (
              <div className="flex flex-col gap-4">
                <Link
                  href="/my-listings"
                  onClick={handleMobileMenuClose}
                  className={mobileNavLinkClasses}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {t('header.myListings')}
                </Link>
                <Link
                  href="/favorites"
                  onClick={handleMobileMenuClose}
                  className={mobileNavLinkClasses}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  {t('header.favorites')}
                </Link>
                <Link
                  href="/compare"
                  onClick={handleMobileMenuClose}
                  className={mobileNavLinkClasses}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                    />
                  </svg>
                  {t('header.compare')}
                  {comparisonCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500 border border-primary-300 text-white text-xs">
                      {comparisonCount}
                    </span>
                  )}
                </Link>
                {user.type === 'Admin' && (
                  <Link
                    href="/admin"
                    onClick={handleMobileMenuClose}
                    className={mobileNavLinkClasses}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    {t('header.admin')}
                  </Link>
                )}
                <Link
                  href="/profile"
                  onClick={handleMobileMenuClose}
                  className={mobileNavLinkClasses}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  {t('header.profile')}
                </Link>
                <button onClick={handleLogout} className={mobileNavLinkClasses}>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  {t('header.logout')}
                </button>
              </div>
            ) : (
              !isErrorPage && (
                <div className="flex flex-col gap-3">
                  <CreateListingButton
                    variant="mobile"
                    onClick={handleMobileMenuClose}
                    className="!py-3.5"
                  />
                  <Link
                    href="/login"
                    onClick={() => {
                      handleMobileMenuClose();
                      if (typeof window !== 'undefined') {
                        const currentUrl = window.location.pathname + window.location.search;
                        if (currentUrl !== '/login' && currentUrl !== '/register') {
                          handleSetReturnUrl(currentUrl);
                        }
                      }
                    }}
                    className="text-white font-medium text-xs hover:text-primary-100 active:text-primary-300 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-1.5 px-2.5 py-3.5 rounded-lg border-2 border-primary-300 active:border-primary-500 select-none"
                  >
                    {t('header.login')}
                  </Link>
                  <Link
                    href="/register"
                    onClick={handleMobileMenuClose}
                    className="text-white font-medium text-xs hover:text-primary-100 active:text-primary-300 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-1.5 px-2.5 py-3.5 rounded-lg border-2 border-primary-300 active:border-primary-500 select-none"
                  >
                    {t('header.register')}
                  </Link>
                </div>
              )
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
