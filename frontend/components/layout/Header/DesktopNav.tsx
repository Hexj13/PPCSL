'use client';

import type { User } from '@/lib/api';

import { GuestDesktopNavActions, GuestDesktopNavLinks } from './GuestDesktopNav';
import { NavSkeleton } from './NavSkeleton';
import { UserDesktopNavActions, UserDesktopNavLinks } from './UserDesktopNav';
import { DESKTOP_HEADER_CLUSTER_GAP_CLASSES } from './desktopHeaderGapClasses';

export type DesktopNavProps = {
  user: User | null;
  showSkeleton: boolean;
  showNav: boolean;
  comparisonCount: number;
  navLinkClasses: string;
  onLogout: () => void;
  onSetReturnUrl: (url: string) => void;
  t: (key: string) => string;
};

export function DesktopNavMenuArea({
  user,
  showSkeleton,
  showNav,
  comparisonCount,
  navLinkClasses,
  t,
}: Pick<
  DesktopNavProps,
  'user' | 'showSkeleton' | 'showNav' | 'comparisonCount' | 'navLinkClasses' | 't'
>) {
  if (!showNav) return null;

  const showLinksSkeleton = showSkeleton;
  const showUserLinks = Boolean(user) && !showSkeleton;
  const showGuestLinks = !user && !showSkeleton;

  return (
    <div
      className={`hidden lg:flex ${DESKTOP_HEADER_CLUSTER_GAP_CLASSES} items-center min-w-0 shrink-0`}
    >
      {showUserLinks && user && (
        <UserDesktopNavLinks
          comparisonCount={comparisonCount}
          navLinkClasses={navLinkClasses}
          userType={user.type}
          t={t}
        />
      )}
      {showGuestLinks && (
        <GuestDesktopNavLinks
          comparisonCount={comparisonCount}
          navLinkClasses={navLinkClasses}
          t={t}
        />
      )}
      {showLinksSkeleton && <NavSkeleton variant="desktopLinks" />}
    </div>
  );
}

export function DesktopNavActions({
  user,
  showSkeleton,
  showNav,
  onLogout,
  onSetReturnUrl,
  t,
}: Pick<
  DesktopNavProps,
  'user' | 'showSkeleton' | 'showNav' | 'onLogout' | 'onSetReturnUrl' | 't'
>) {
  if (!showNav) return null;

  return (
    <nav className={`hidden lg:flex ${DESKTOP_HEADER_CLUSTER_GAP_CLASSES} items-center shrink-0`}>
      {showSkeleton ? (
        <NavSkeleton variant="desktopActions" />
      ) : user ? (
        <UserDesktopNavActions user={user} onLogout={onLogout} t={t} />
      ) : (
        <GuestDesktopNavActions onSetReturnUrl={onSetReturnUrl} t={t} />
      )}
    </nav>
  );
}
