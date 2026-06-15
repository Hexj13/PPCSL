'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { isSignRoutePathname } from '@/components/layout/header-flow-paths';
import { CreateListingButton } from '@/components/listing/CreateListingButton';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { prepareScrollLockReleaseToTop } from '@/hooks/useScrollLock';
import { buildSignPageHref } from '@/lib/return-url';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

import { ScaleIcon } from './icons';

const guestLinkClasses =
  'text-primary-700 font-medium text-sm hover-only:hover:text-primary-900 active:text-primary-900 hover-only:hover:border-primary-900 active:border-primary-900 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-1.5 px-2.5 py-3.5 rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base';

const iconClass = 'w-4 h-4';

type GuestMobileNavProps = {
  comparisonCount: number;
  mobileNavLinkClasses: string;
  isAuthPage: boolean;
  isErrorPage: boolean;
  onSetReturnUrl: (url: string) => void;
  onClose: () => void;
  t: (key: string) => string;
};

export function GuestMobileNav({
  comparisonCount,
  mobileNavLinkClasses,
  isAuthPage,
  isErrorPage,
  onSetReturnUrl,
  onClose,
  t,
}: GuestMobileNavProps) {
  const pathname = usePathname();
  const { href } = useLocalizedNavigation();
  const isSignPage = isSignRoutePathname(pathname);

  if (isErrorPage) return null;

  if (isSignPage) {
    return null;
  }

  if (isAuthPage) return null;

  const handleSignClick = () => {
    onClose();
    if (typeof window !== 'undefined') {
      if (!isSignRoutePathname(window.location.pathname)) {
        onSetReturnUrl(window.location.pathname + window.location.search);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <CreateListingButton variant="mobile" onClick={onClose} className="py-3.5!" />
      <Link
        href={buildSignPageHref({ tab: 'login' })}
        onClick={handleSignClick}
        className={guestLinkClasses}
      >
        <span suppressHydrationWarning>{t('header.loginAndRegister')}</span>
      </Link>
      <div className="flex flex-col gap-4 border-t border-primary-700 pt-4">
        <Link
          href={href('/compare')}
          onClick={() => {
            prepareScrollLockReleaseToTop();
            onClose();
            if (stripLocalePrefixFromPathname(pathname).restPath === '/compare') {
              window.scrollTo({ top: 0, behavior: 'instant' });
            }
          }}
          className={mobileNavLinkClasses}
        >
          <ScaleIcon className={iconClass} />
          <span suppressHydrationWarning>{t('header.compare')}</span>
          {comparisonCount > 0 && (
            <span className="ml-2 min-w-[1.25rem] px-2 py-0.5 rounded-full bg-primary-500 border border-primary-300 text-white text-xs text-center">
              {comparisonCount > 99 ? '99+' : comparisonCount}
            </span>
          )}
        </Link>
        <div className="w-full">
          <LanguageSwitcher variant="mobile" context="header" />
        </div>
      </div>
    </div>
  );
}
