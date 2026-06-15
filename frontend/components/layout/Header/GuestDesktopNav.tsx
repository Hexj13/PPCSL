'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { isSignRoutePathname } from '@/components/layout/header-flow-paths';
import { CreateListingButton } from '@/components/listing/CreateListingButton';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { buildSignPageHref } from '@/lib/return-url';

import { ScaleIcon } from './icons';

type GuestDesktopNavProps = {
  comparisonCount: number;
  navLinkClasses: string;
  isAuthPage: boolean;
  isErrorPage: boolean;
  onSetReturnUrl: (url: string) => void;
  t: (key: string) => string;
};

const loginLinkClasses =
  'text-primary-700 font-medium h-10 text-xs md:text-xs lg:text-sm xl:text-sm hover-only:hover:text-primary-900 active:text-primary-900 hover-only:hover:border-primary-900 active:border-primary-900 transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 md:gap-2 px-2 md:px-2.5 lg:px-2.5 xl:px-3 rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base';

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
      <Link href={href('/compare')} className={navLinkClasses}>
        <ScaleIcon />
        <span suppressHydrationWarning>{t('header.compare')}</span>
        {comparisonCount > 0 && (
          <span className="ml-2 min-w-[1.25rem] rounded-full border border-primary-300 bg-primary-500 px-2 py-0.5 text-xs text-white text-center">
            {comparisonCount > 99 ? '99+' : comparisonCount}
          </span>
        )}
      </Link>
      <div className="h-6 w-px bg-primary-700/30 mx-1 shrink-0" aria-hidden />
      <Link
        href={buildSignPageHref({ tab: 'login' })}
        onClick={handleSignClick}
        className={loginLinkClasses}
      >
        <span suppressHydrationWarning>{t('header.loginAndRegister')}</span>
      </Link>
      <CreateListingButton variant="desktop" />
      <div className="h-6 w-px bg-primary-700/30 mx-1 shrink-0" aria-hidden />
      <LanguageSwitcher variant="desktop" context="header" />
    </>
  );
}
