'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { isSignRoutePathname } from '@/components/layout/header-flow-paths';
import { CreateListingButton } from '@/components/listing/CreateListingButton';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import type { User } from '@/lib/api';

import { HeaderMoreDropdown } from './HeaderMoreDropdown';
import { DocumentsIcon, HeartIcon, ScaleIcon } from './icons';

type UserDesktopNavLinksProps = {
  user: User;
  comparisonCount: number;
  navLinkClasses: string;
  onLogout: () => void;
  t: (key: string) => string;
};

export function UserDesktopNavLinks({
  user,
  comparisonCount,
  navLinkClasses,
  onLogout,
  t,
}: UserDesktopNavLinksProps) {
  const { href } = useLocalizedNavigation();
  return (
    <>
      <Link href={href('/my-listings')} className={navLinkClasses}>
        <DocumentsIcon />
        <span suppressHydrationWarning>{t('header.myListings')}</span>
      </Link>
      <Link href={href('/favorites')} className={navLinkClasses}>
        <HeartIcon />
        <span suppressHydrationWarning>{t('header.favorites')}</span>
      </Link>
      <Link href={href('/compare')} className={`${navLinkClasses} hidden xl:flex`}>
        <ScaleIcon />
        <span suppressHydrationWarning>{t('header.compare')}</span>
        {comparisonCount > 0 && (
          <span className="ml-2 min-w-[1.25rem] rounded-full border border-primary-300 bg-primary-500 px-2 py-0.5 text-xs text-white text-center">
            {comparisonCount > 99 ? '99+' : comparisonCount}
          </span>
        )}
      </Link>
      <HeaderMoreDropdown
        user={user}
        comparisonCount={comparisonCount}
        navLinkClasses={navLinkClasses}
        onLogout={onLogout}
        t={t}
      />
    </>
  );
}

type UserDesktopNavActionsProps = {
  isAuthPage: boolean;
  isErrorPage: boolean;
};

export function UserDesktopNavActions({ isAuthPage, isErrorPage }: UserDesktopNavActionsProps) {
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
    </>
  );
}
