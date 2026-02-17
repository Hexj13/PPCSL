'use client';

import type { User } from '@/lib/api';

import { GuestDesktopNav } from './GuestDesktopNav';
import { NavSkeleton } from './NavSkeleton';
import { UserDesktopNav } from './UserDesktopNav';

type DesktopNavProps = {
  user: User | null;
  showSkeleton: boolean;
  showNav: boolean;
  comparisonCount: number;
  isAuthPage: boolean;
  isErrorPage: boolean;
  navLinkClasses: string;
  onLogout: () => void;
  onSetReturnUrl: (url: string) => void;
  t: (key: string) => string;
};

export function DesktopNav({
  user,
  showSkeleton,
  showNav,
  comparisonCount,
  isAuthPage,
  isErrorPage,
  navLinkClasses,
  onLogout,
  onSetReturnUrl,
  t,
}: DesktopNavProps) {
  if (!showNav) return null;

  return (
    <nav className="hidden lg:flex gap-1.5 lg:gap-2 xl:gap-4 items-center">
      {showSkeleton ? (
        <NavSkeleton variant="desktop" />
      ) : user ? (
        <UserDesktopNav
          user={user}
          comparisonCount={comparisonCount}
          isAuthPage={isAuthPage}
          isErrorPage={isErrorPage}
          navLinkClasses={navLinkClasses}
          onLogout={onLogout}
          t={t}
        />
      ) : (
        <GuestDesktopNav
          isAuthPage={isAuthPage}
          isErrorPage={isErrorPage}
          onSetReturnUrl={onSetReturnUrl}
          t={t}
        />
      )}
    </nav>
  );
}
