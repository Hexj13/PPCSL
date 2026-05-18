'use client';

import { usePathname } from 'next/navigation';

import { isSignRoutePathname } from '@/components/layout/header-flow-paths';
import type { User } from '@/lib/api';

import { GuestDesktopNav } from './GuestDesktopNav';
import { NavSkeleton } from './NavSkeleton';
import { UserDesktopNavActions, UserDesktopNavLinks } from './UserDesktopNav';

export type DesktopNavProps = {
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

export function DesktopNavMenuArea({
  user,
  showSkeleton,
  showNav,
  comparisonCount,
  navLinkClasses,
  onLogout,
  t,
}: Pick<
  DesktopNavProps,
  'user' | 'showSkeleton' | 'showNav' | 'comparisonCount' | 'navLinkClasses' | 'onLogout' | 't'
>) {
  if (!showNav) return null;

  const showLinksSkeleton = Boolean(showSkeleton && user);
  const showUserLinks = Boolean(user) && !showSkeleton;

  if (!showLinksSkeleton && !showUserLinks) return null;

  return (
    <div className="hidden lg:flex gap-2 xl:gap-4 items-center min-w-0 shrink-0">
      {showUserLinks && user && (
        <UserDesktopNavLinks
          user={user}
          comparisonCount={comparisonCount}
          navLinkClasses={navLinkClasses}
          onLogout={onLogout}
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
  comparisonCount,
  navLinkClasses,
  isAuthPage,
  isErrorPage,
  onSetReturnUrl,
  t,
}: Pick<
  DesktopNavProps,
  | 'user'
  | 'showSkeleton'
  | 'showNav'
  | 'comparisonCount'
  | 'navLinkClasses'
  | 'isAuthPage'
  | 'isErrorPage'
  | 'onSetReturnUrl'
  | 't'
>) {
  const pathname = usePathname();
  if (!showNav) return null;

  const actionsSkeletonVariant =
    !user && isSignRoutePathname(pathname) ? 'desktopSignGuest' : 'desktopActions';

  return (
    <nav className="hidden lg:flex gap-2 xl:gap-4 items-center shrink-0">
      {showSkeleton ? (
        <NavSkeleton variant={actionsSkeletonVariant} />
      ) : user ? (
        <UserDesktopNavActions isAuthPage={isAuthPage} isErrorPage={isErrorPage} />
      ) : (
        <GuestDesktopNav
          comparisonCount={comparisonCount}
          navLinkClasses={navLinkClasses}
          isAuthPage={isAuthPage}
          isErrorPage={isErrorPage}
          onSetReturnUrl={onSetReturnUrl}
          t={t}
        />
      )}
    </nav>
  );
}
