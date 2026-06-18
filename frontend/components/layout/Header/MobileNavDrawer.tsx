'use client';

import { createPortal } from 'react-dom';

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

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <nav
      id={id}
      dir="ltr"
      className={`${motionClass} fixed left-0 top-[4.5rem] bottom-0 z-[45] w-[80vw] max-w-md pb-4 pt-4 bg-bg-base shadow-lg border-r border-primary-700 overflow-y-auto scrollbar-custom lg:hidden ${presenceClosing ? 'pointer-events-none' : ''}`}
    >
      <div className="px-3 sm:px-4">
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
    </nav>,
    document.body,
  );
}
