'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { isSignRoutePathname } from '@/components/layout/header-flow-paths';
import { CreateListingButton } from '@/components/listing/CreateListingButton';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { buildSignInHref, buildSignPageHref } from '@/lib/return-url';

import { HeaderListingsNavLink } from './HeaderListingsNavLink';
import { DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES } from './desktopNavLinkClasses';
import { DESKTOP_HEADER_OUTLINE_LINK_CLASSES } from './desktopOutlineLinkClasses';

type GuestDesktopNavProps = {
  comparisonCount: number;
  navLinkClasses: string;
  isAuthPage: boolean;
  isErrorPage: boolean;
  onSetReturnUrl: (url: string) => void;
  t: (key: string) => string;
};

export function GuestDesktopNav({
  comparisonCount,
  navLinkClasses,
  isAuthPage,
  isErrorPage,
  onSetReturnUrl,
  t,
}: GuestDesktopNavProps) {
  const pathname = usePathname();
  const { href } = useLocalizedNavigation();
  const isSignPage = isSignRoutePathname(pathname);

  if (isErrorPage) return null;

  if (isSignPage) {
    return <LanguageSwitcher variant="desktop" context="header" />;
  }

  if (isAuthPage) return null;

  const handleSignClick = () => {
    if (typeof window !== 'undefined') {
      if (!isSignRoutePathname(window.location.pathname)) {
        onSetReturnUrl(window.location.pathname + window.location.search);
      }
    }
  };

  return (
    <>
      <HeaderListingsNavLink
        className={navLinkClasses}
        labelClassName={DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES}
        t={t}
      />
      <Link href={buildSignInHref('/favorites')} className={navLinkClasses}>
        <span className={DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES} suppressHydrationWarning>
          {t('header.favorites')}
        </span>
      </Link>
      <Link href={href('/compare')} className={navLinkClasses}>
        <span className={DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES} suppressHydrationWarning>
          {t('header.compare')}
        </span>
        {comparisonCount > 0 && (
          <span className="ml-2 min-w-[1.25rem] rounded-full border border-primary-300 bg-primary-500 px-2 py-0.5 text-xs text-white text-center">
            {comparisonCount > 99 ? '99+' : comparisonCount}
          </span>
        )}
      </Link>
      <Link href={href('/partners')} className={navLinkClasses}>
        <span className={DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES} suppressHydrationWarning>
          {t('header.forBusiness')}
        </span>
      </Link>
      <div className="h-6 w-px bg-primary-700/30 mx-1 shrink-0" aria-hidden />
      <Link
        href={buildSignPageHref({ tab: 'login' })}
        onClick={handleSignClick}
        className={DESKTOP_HEADER_OUTLINE_LINK_CLASSES}
      >
        <span suppressHydrationWarning>{t('header.loginAndRegister')}</span>
      </Link>
      <CreateListingButton variant="desktop" />
      <div className="h-6 w-px bg-primary-700/30 mx-1 shrink-0" aria-hidden />
      <LanguageSwitcher variant="desktop" context="header" />
    </>
  );
}
