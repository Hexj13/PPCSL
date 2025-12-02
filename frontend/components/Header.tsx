'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore, useComparisonStore } from '@/lib/store';

export function Header() {
  const { user, logout, isInitialized } = useAuthStore();
  const comparisonCount = useComparisonStore((state) => state.count());
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    router.replace('/');
  };

  return (
    <header className="bg-bg-dark shadow-lg border-b-2 border-primary-500/20 sticky top-0 z-50 backdrop-blur-sm bg-bg-dark/95">
      <div className="container mx-auto px-3 sm:px-4 py-3 md:py-4">
        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition-opacity duration-200 select-none"
          >
            <Image
              src="/logo-mobile.png"
              alt={t('header.brandName')}
              width={260}
              height={112}
              className="block md:hidden h-auto w-auto"
              style={{ width: '98px', height: 'auto' }}
              priority
            />
            <Image
              src="/logo-desktop.png"
              alt={t('header.brandName')}
              width={392}
              height={144}
              className="hidden md:block h-auto w-auto"
              style={{ width: '147px', height: 'auto' }}
              priority
            />
          </Link>

          <div className="flex items-center lg:hidden gap-3">
            {!isInitialized ? (
              <div className="h-9 w-20 bg-bg-light/30 rounded animate-pulse" />
            ) : user ? (
              <Link
                href="/listings/new"
                className="text-primary-400 font-medium text-xs hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center gap-1.5 px-2.5 py-2 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 select-none"
              >
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>{t('header.addListing')}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('returnUrl', '/listings/new');
                  }
                }}
                className="text-primary-400 font-medium text-xs hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center gap-1.5 px-2.5 py-2 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 select-none"
              >
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>{t('header.createListing')}</span>
              </Link>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-primary-500 hover:text-primary-400 transition-colors duration-200 p-2 select-none"
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

          <nav className="hidden lg:flex gap-3 lg:gap-6 items-center">
            {!isInitialized ? (
              <div className="flex gap-4 items-center">
                <div className="h-9 w-24 bg-bg-light/30 rounded animate-pulse" />
                <div className="h-9 w-32 bg-bg-light/30 rounded animate-pulse" />
              </div>
            ) : user ? (
              <>
                <Link
                  href="/listings/new"
                  className="text-primary-400 font-medium text-xs md:text-sm lg:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 select-none"
                >
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="hidden xl:inline">{t('header.addListing')}</span>
                  <span className="xl:hidden">{t('header.addListingShort')}</span>
                </Link>
                <Link
                  href="/my-listings"
                  className="text-white font-medium text-xs md:text-sm lg:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center gap-1.5 md:gap-2 px-1.5 md:px-2 py-1.5 md:py-2 rounded select-none"
                >
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
                <Link
                  href="/favorites"
                  className="text-white font-medium text-xs md:text-sm lg:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center gap-1.5 md:gap-2 px-1.5 md:px-2 py-1.5 md:py-2 rounded select-none"
                >
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
                <Link
                  href="/compare"
                  className="text-white font-medium text-xs md:text-sm lg:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center gap-1.5 md:gap-2 px-1.5 md:px-2 py-1.5 md:py-2 rounded select-none"
                >
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
                    <span className="bg-bg-light border border-primary-500/20 text-gray-300 text-[10px] md:text-xs font-bold rounded-[4px] w-4 h-4 md:w-5 md:h-5 flex items-center justify-center ml-1">
                      {comparisonCount}
                    </span>
                  )}
                </Link>
                {user.type === 'Admin' && (
                  <Link
                    href="/admin"
                    className="text-white font-medium text-xs md:text-sm lg:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center gap-1.5 md:gap-2 px-1.5 md:px-2 py-1.5 md:py-2 rounded select-none"
                  >
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
                <Link
                  href="/profile"
                  className="text-white font-medium text-xs md:text-sm lg:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center gap-1.5 md:gap-2 px-1.5 md:px-2 py-1.5 md:py-2 rounded select-none"
                >
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
                <button
                  onClick={handleLogout}
                  className="text-gray-400 font-medium hover:text-primary-400 transition-colors duration-200 flex items-center justify-center w-10 h-10 rounded-lg border-2 border-gray-400/20 hover:border-primary-400/40 select-none"
                >
                  <svg
                    className="w-5 h-5"
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
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('returnUrl', '/listings/new');
                    }
                  }}
                  className="btn-outline-green flex items-center gap-2 select-none"
                >
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="hidden xl:inline">{t('header.createListing')}</span>
                  <span className="xl:hidden">{t('header.createListingShort')}</span>
                </Link>
                <Link
                  href="/login"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const currentUrl = window.location.pathname + window.location.search;
                      if (currentUrl !== '/login' && currentUrl !== '/register') {
                        localStorage.setItem('returnUrl', currentUrl);
                      }
                    }
                  }}
                  className="btn-outline-green select-none"
                >
                  <span className="hidden xl:inline">{t('header.login')}</span>
                  <span className="xl:hidden">{t('header.loginShort')}</span>
                </Link>
                <Link href="/register" className="btn-primary select-none">
                  {t('header.register')}
                </Link>
              </>
            )}
          </nav>
        </div>

        {isMobileMenuOpen && (
          <nav className="lg:hidden mt-4 pb-4 border-t border-primary-500/20 pt-4">
            {!isInitialized ? (
              <div className="flex flex-col gap-3">
                <div className="h-10 bg-bg-light/30 rounded animate-pulse" />
                <div className="h-10 bg-bg-light/30 rounded animate-pulse" />
              </div>
            ) : user ? (
              <div className="flex flex-col gap-4">
                <Link
                  href="/my-listings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white font-medium hover:text-primary-500 transition-colors duration-200 py-2 pl-4 flex items-center gap-2 select-none"
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
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white font-medium hover:text-primary-500 transition-colors duration-200 py-2 pl-4 flex items-center gap-2 select-none"
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
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white font-medium hover:text-primary-500 transition-colors duration-200 py-2 pl-4 flex items-center gap-2 select-none"
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
                    <span className="bg-bg-light border border-primary-500/20 text-gray-300 text-xs font-bold rounded-[4px] w-5 h-5 flex items-center justify-center">
                      {comparisonCount}
                    </span>
                  )}
                </Link>
                {user.type === 'Admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-white font-medium hover:text-primary-500 transition-colors duration-200 py-2 pl-4 flex items-center gap-2 select-none"
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
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white font-medium hover:text-primary-500 transition-colors duration-200 py-2 pl-4 flex items-center gap-2 select-none"
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
                <button
                  onClick={handleLogout}
                  className="text-white font-medium hover:text-primary-500 transition-colors duration-200 py-2 pl-4 flex items-center gap-2 select-none"
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
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  {t('header.logout')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('returnUrl', '/listings/new');
                    }
                  }}
                  className="btn-outline-green flex items-center justify-center gap-2 text-center select-none"
                >
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  {t('header.createListing')}
                </Link>
                <Link
                  href="/login"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (typeof window !== 'undefined') {
                      const currentUrl = window.location.pathname + window.location.search;
                      if (currentUrl !== '/login' && currentUrl !== '/register') {
                        localStorage.setItem('returnUrl', currentUrl);
                      }
                    }
                  }}
                  className="btn-outline-green text-center select-none"
                >
                  {t('header.login')}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn-primary text-center select-none"
                >
                  {t('header.register')}
                </Link>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
