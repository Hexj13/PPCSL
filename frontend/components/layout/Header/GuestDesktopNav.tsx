'use client';

import Link from 'next/link';

import { isSignRoutePathname } from '@/components/layout/header-flow-paths';
import { CreateListingButton } from '@/components/listing/CreateListingButton';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { buildSignInHref, buildSignPageHref } from '@/lib/return-url';

import { HeaderListingsNavLink } from './HeaderListingsNavLink';
import { HeaderMoreDropdown } from './HeaderMoreDropdown';
import { DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES } from './desktopNavLinkClasses';
import { DESKTOP_HEADER_OUTLINE_LINK_CLASSES } from './desktopOutlineLinkClasses';
import { UserIcon } from './icons';

type GuestDesktopNavLinksProps = {
  comparisonCount: number;
  navLinkClasses: string;
  t: (key: string) => string;
};

export function GuestDesktopNavLinks({
  comparisonCount,
  navLinkClasses,
  t,
}: GuestDesktopNavLinksProps) {
  const { href } = useLocalizedNavigation();

  return (
    <>
      <HeaderListingsNavLink
        className={navLinkClasses}
        labelClassName={DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES}
        t={t}
      />
      <Link href={buildSignInHref('/favorites')} className={`${navLinkClasses} lg:hidden xl:flex`}>
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
      <Link href={href('/partners')} className={`${navLinkClasses} lg:hidden xl:flex`}>
        <span className={DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES} suppressHydrationWarning>
          {t('header.forBusiness')}
        </span>
      </Link>
      <HeaderMoreDropdown
        favoritesHref={buildSignInHref('/favorites')}
        compareHref={href('/compare')}
        partnersHref={href('/partners')}
        comparisonCount={comparisonCount}
        navLinkClasses={navLinkClasses}
        t={t}
      />
    </>
  );
}

type GuestDesktopNavActionsProps = {
  onSetReturnUrl: (url: string) => void;
  t: (key: string) => string;
};

export function GuestDesktopNavActions({ onSetReturnUrl, t }: GuestDesktopNavActionsProps) {
  const handleSignClick = () => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!isSignRoutePathname(window.location.pathname)) {
      onSetReturnUrl(window.location.pathname + window.location.search);
    }
  };

  return (
    <>
      <Link
        href={buildSignPageHref({ tab: 'login' })}
        onClick={handleSignClick}
        className={DESKTOP_HEADER_OUTLINE_LINK_CLASSES}
      >
        <UserIcon />
        <span suppressHydrationWarning>{t('header.loginAndRegister')}</span>
      </Link>
      <CreateListingButton variant="desktop" />
    </>
  );
}
