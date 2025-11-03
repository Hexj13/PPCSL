'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { User } from '@/lib/api';

export function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getUserDisplayName = (userParam: User | null): string => {
    if (!userParam) return '';
    if (userParam.firstName && userParam.lastName) {
      return `${userParam.firstName} ${userParam.lastName}`;
    }
    return userParam.email || '';
  };

  const handleLogout = () => {
    logout();
    router.push('/');
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-bg-dark shadow-lg border-b-2 border-primary-500/20 sticky top-0 z-50 backdrop-blur-sm bg-bg-dark/95">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent hover:from-primary-400 hover:to-primary-500 transition-all duration-200"
          >
            Kupito
          </Link>

          <nav className="hidden md:flex gap-6 items-center">
            {user ? (
              <>
                <Link
                  href="/listings/new"
                  className="text-white font-medium hover:text-primary-500 transition-colors duration-200"
                >
                  Додади објава
                </Link>
                <Link
                  href="/my-listings"
                  className="text-white font-medium hover:text-primary-500 transition-colors duration-200"
                >
                  Мои објави
                </Link>
                <Link
                  href="/favorites"
                  className="text-white font-medium hover:text-primary-500 transition-colors duration-200"
                >
                  Омилени
                </Link>
                {user.type === 'Admin' && (
                  <Link
                    href="/admin"
                    className="text-white font-medium hover:text-primary-500 transition-colors duration-200"
                  >
                    Админ
                  </Link>
                )}
                <span className="text-gray-300 font-medium px-3 py-1.5 bg-bg-light rounded-lg border border-primary-500/20 text-sm lg:text-base">
                  {getUserDisplayName(user)}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-secondary px-4 py-1.5 text-sm lg:text-base"
                >
                  Одјави се
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-outline">
                  Најави се
                </Link>
                <Link href="/register" className="btn-primary">
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
            {user ? (
              <div className="flex flex-col gap-4">
                <Link
                  href="/listings/new"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white font-medium hover:text-primary-500 transition-colors duration-200 py-2"
                >
                  Додај објава
                </Link>
                <Link
                  href="/my-listings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white font-medium hover:text-primary-500 transition-colors duration-200 py-2"
                >
                  Мои објави
                </Link>
                <Link
                  href="/favorites"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white font-medium hover:text-primary-500 transition-colors duration-200 py-2"
                >
                  Омилени
                </Link>
                {user.type === 'Admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-white font-medium hover:text-primary-500 transition-colors duration-200 py-2"
                  >
                    Админ
                  </Link>
                )}
                <div className="text-gray-300 font-medium px-3 py-2 bg-bg-light rounded-lg border border-primary-500/20 text-sm break-all">
                  {getUserDisplayName(user)}
                </div>
                <button onClick={handleLogout} className="btn-secondary w-full">
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
