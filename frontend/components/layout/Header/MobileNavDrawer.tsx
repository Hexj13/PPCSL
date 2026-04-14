'use client';

import type { User } from '@/lib/api';

import { GuestMobileNav } from './GuestMobileNav';
import { NavSkeleton } from './NavSkeleton';
import { UserMobileNav } from './UserMobileNav';

type MobileNavDrawerProps = {
  id: string;
  presenceMounted: boolean;
  presenceClosing: boolean;
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
  id,
  presenceMounted,
  presenceClosing,
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
  if (!presenceMounted || !showNav) return null;

  const motionClass = presenceClosing ? 'mobile-nav-drawer-leave' : 'mobile-nav-drawer-enter';

  return (
    <nav
      id={id}
      className={`${motionClass} absolute left-0 right-0 top-0 z-[15] pb-4 pt-4 bg-bg-base shadow-lg border-b border-primary-700 max-h-[calc(100dvh-4.5rem)] w-full overflow-y-auto scrollbar-custom ${presenceClosing ? 'pointer-events-none' : ''}`}
    >
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
            comparisonCount={comparisonCount}
            mobileNavLinkClasses={mobileNavLinkClasses}
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
