'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { User } from '@/lib/api';
import { useAuthStore, useComparisonStore } from '@/lib/store';

export function Header() {
  const { user, logout, isInitialized } = useAuthStore();
  const comparisonCount = useComparisonStore((state) => state.count());
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getUserDisplayName = (userParam: User | null): string => {
    if (!userParam) return '';

    if (userParam.type === 'Business' && userParam.companyName) {
      return userParam.companyName;
    }

    if (userParam.firstName) {
      if (userParam.lastName) {
        return `${userParam.firstName} ${userParam.lastName}`;
      }
      return userParam.firstName;
    }

    if (userParam.email) {
      return userParam.email;
    }

    if (userParam.phone) {
      return userParam.phone;
    }

    return '';
  };

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    router.replace('/');
  };

  return (
    <header className="bg-bg-dark shadow-lg border-b-2 border-primary-500/20 sticky top-0 z-50 backdrop-blur-sm bg-bg-dark/95">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="text-xl sm:text-2xl md:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent hover:from-primary-400 hover:to-primary-500 transition-all duration-200"
          >
            Kupito
          </Link>

          <nav className="hidden md:flex gap-3 lg:gap-6 items-center">
            {!isInitialized ? (
              <div className="flex gap-4 items-center">
                <div className="h-9 w-24 bg-bg-light/30 rounded animate-pulse" />
                <div className="h-9 w-32 bg-bg-light/30 rounded animate-pulse" />
              </div>
            ) : user ? (
              <>
                <Link
                  href="/listings/new"
                  className="text-white font-medium text-sm lg:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Додади објава
                </Link>
                <Link
                  href="/my-listings"
                  className="text-white font-medium text-sm lg:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Мои објави
                </Link>
                <Link
                  href="/favorites"
                  className="text-white font-medium text-sm lg:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  Омилени
                </Link>
                <Link
                  href="/compare"
                  className="text-white font-medium text-sm lg:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                    />
                  </svg>
                  Споредба
                  {comparisonCount > 0 && (
                    <span className="bg-bg-light border border-primary-500/20 text-gray-300 text-xs font-bold rounded-[4px] w-5 h-5 flex items-center justify-center">
                      {comparisonCount}
                    </span>
                  )}
                </Link>
                {user.type === 'Admin' && (
                  <Link
                    href="/admin"
                    className="text-white font-medium text-sm lg:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    Админ
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="text-gray-300 font-medium px-2 md:px-3 py-1.5 bg-bg-light rounded-lg border border-primary-500/20 text-xs md:text-sm lg:text-base hover:text-primary-400 hover:border-primary-500/40 transition-colors duration-200 cursor-pointer flex items-center gap-1.5 md:gap-2"
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
                  <span className="truncate max-w-[120px] md:max-w-[150px] lg:max-w-none">
                    {getUserDisplayName(user)}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-300 font-medium px-2 md:px-3 py-1.5 bg-bg-light rounded-lg border border-primary-500/20 text-xs md:text-sm lg:text-base hover:text-primary-400 hover:border-primary-500/40 transition-colors duration-200 cursor-pointer flex items-center gap-1.5 md:gap-2 whitespace-nowrap"
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
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Одјави се
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-outline text-sm lg:text-base px-3 lg:px-4">
                  Најави се
                </Link>
                <Link href="/register" className="btn-primary text-sm lg:text-base px-3 lg:px-4">
                  Регистрација
                </Link>
              </>
            )}
          </nav>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white hover:text-primary-500 transition-colors duration-200 p-2"
            aria-label="Toggle menu"
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

        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-primary-500/20 pt-4">
            {!isInitialized ? (
              <div className="flex flex-col gap-3">
                <div className="h-10 bg-bg-light/30 rounded animate-pulse" />
                <div className="h-10 bg-bg-light/30 rounded animate-pulse" />
              </div>
            ) : user ? (
              <div className="flex flex-col gap-4">
                <Link
                  href="/listings/new"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white font-medium hover:text-primary-500 transition-colors duration-200 py-2 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Додај објава
                </Link>
                <Link
                  href="/my-listings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white font-medium hover:text-primary-500 transition-colors duration-200 py-2 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Мои објави
                </Link>
                <Link
                  href="/favorites"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white font-medium hover:text-primary-500 transition-colors duration-200 py-2 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  Омилени
                </Link>
                <Link
                  href="/compare"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white font-medium hover:text-primary-500 transition-colors duration-200 py-2 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                    />
                  </svg>
                  Споредба
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
                    className="text-white font-medium hover:text-primary-500 transition-colors duration-200 py-2 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    Админ
                  </Link>
                )}
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-gray-300 font-medium px-3 py-2 bg-bg-light rounded-lg border border-primary-500/20 text-sm break-all hover:text-primary-400 hover:border-primary-500/40 transition-colors duration-200 cursor-pointer flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4 flex-shrink-0"
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
                  {getUserDisplayName(user)}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-300 font-medium px-3 py-2 bg-bg-light rounded-lg border border-primary-500/20 text-sm hover:text-primary-400 hover:border-primary-500/40 transition-colors duration-200 cursor-pointer w-full flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4 flex-shrink-0"
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
                  Одјави се
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn-outline text-center"
                >
                  Најави се
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn-primary text-center"
                >
                  Регистрација
                </Link>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
