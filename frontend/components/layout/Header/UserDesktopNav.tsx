'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { isSignRoutePathname } from '@/components/layout/header-flow-paths';
import { CreateListingButton } from '@/components/listing/CreateListingButton';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import type { User } from '@/lib/api';

import { HeaderListingsNavLink } from './HeaderListingsNavLink';
import { HeaderMoreDropdown } from './HeaderMoreDropdown';
import { HeaderProfileDropdown } from './HeaderProfileDropdown';
import { DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES } from './desktopNavLinkClasses';

type UserDesktopNavLinksProps = {
  comparisonCount: number;
  navLinkClasses: string;
  userType: User['type'];
  t: (key: string) => string;
};

export function UserDesktopNavLinks({
  comparisonCount,
  navLinkClasses,
  userType,
  t,
}: UserDesktopNavLinksProps) {
  const { href } = useLocalizedNavigation();
  return (
    <>
      <HeaderListingsNavLink
        className={navLinkClasses}
        labelClassName={DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES}
        t={t}
      />
      <Link href={href('/favorites')} className={navLinkClasses}>
        <span className={DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES} suppressHydrationWarning>
          {t('header.favorites')}
        </span>
      </Link>
      <Link href={href('/compare')} className={`${navLinkClasses} lg:hidden xl:flex`}>
        <span className={DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES} suppressHydrationWarning>
          {t('header.compare')}
        </span>
        {comparisonCount > 0 && (
          <span className="ml-2 min-w-[1.25rem] rounded-full border border-primary-300 bg-primary-500 px-2 py-0.5 text-xs text-white text-center">
            {comparisonCount > 99 ? '99+' : comparisonCount}
          </span>
        )}
      </Link>
      <Link href={href('/my-listings')} className={`${navLinkClasses} lg:hidden xl:flex`}>
        <span className={DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES} suppressHydrationWarning>
          {t('header.myListings')}
        </span>
      </Link>
      {userType !== 'Individual' && (
        <Link href={href('/partners')} className={`${navLinkClasses} lg:hidden xl:flex`}>
          <span className={DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES} suppressHydrationWarning>
            {t('header.forBusiness')}
          </span>
        </Link>
      )}
      <HeaderMoreDropdown
        compareHref={href('/compare')}
        myListingsHref={href('/my-listings')}
        partnersHref={userType !== 'Individual' ? href('/partners') : undefined}
        comparisonCount={comparisonCount}
        navLinkClasses={navLinkClasses}
        t={t}
      />
    </>
  );
}

type UserDesktopNavActionsProps = {
  user: User;
  isAuthPage: boolean;
  isErrorPage: boolean;
  onLogout: () => void;
  t: (key: string) => string;
};

export function UserDesktopNavActions({
  user,
  isAuthPage,
  isErrorPage,
  onLogout,
  t,
}: UserDesktopNavActionsProps) {
  const pathname = usePathname();
  const showLang = (!isAuthPage && !isErrorPage) || (isSignRoutePathname(pathname) && !isErrorPage);

  return (
    <>
      <CreateListingButton variant="desktop" />
      {showLang && (
        <>
          <div className="mx-1 h-6 w-px bg-primary-700/30 shrink-0" />
          <LanguageSwitcher variant="desktop" context="header" />
        </>
      )}
      <HeaderProfileDropdown user={user} onLogout={onLogout} t={t} />
    </>
  );
}
