'use client';

import type { User } from '@/lib/api';

import { GuestMobileNav } from './GuestMobileNav';
import { NavSkeleton } from './NavSkeleton';
import { UserMobileNav } from './UserMobileNav';

type MobileNavDrawerProps = {
  isOpen: boolean;
  user: User | null;
  showSkeleton: boolean;
  showNav: boolean;
  comparisonCount: number;
  isAuthPage: boolean;
  isErrorPage: boolean;
  mobileNavLinkClasses: string;
  onLogout: () => void;
  onClose: () => void;
  onSetReturnUrl: (url: string) => void;
  t: (key: string) => string;
};

export function MobileNavDrawer({
  isOpen,
  user,
  showSkeleton,
  showNav,
  comparisonCount,
  isAuthPage,
  isErrorPage,
  mobileNavLinkClasses,
  onLogout,
  onClose,
  onSetReturnUrl,
  t,
}: MobileNavDrawerProps) {
  if (!isOpen || !showNav) return null;

  return (
    <nav className="lg:hidden relative z-[1] pb-4 pt-4 bg-primary-700 w-full">
      <div className="container mx-auto px-3 sm:px-4">
        {showSkeleton ? (
          <NavSkeleton variant="mobile" />
        ) : user ? (
          <UserMobileNav
            user={user}
            comparisonCount={comparisonCount}
            isAuthPage={isAuthPage}
            isErrorPage={isErrorPage}
            mobileNavLinkClasses={mobileNavLinkClasses}
            onLogout={onLogout}
            onClose={onClose}
            t={t}
          />
        ) : (
          <GuestMobileNav
            isAuthPage={isAuthPage}
            isErrorPage={isErrorPage}
            onSetReturnUrl={onSetReturnUrl}
            onClose={onClose}
            t={t}
          />
        )}
      </div>
    </nav>
  );
}
