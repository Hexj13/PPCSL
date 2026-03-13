'use client';

import Link from 'next/link';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { CreateListingButton } from '@/components/listing/CreateListingButton';
import type { User } from '@/lib/api';

import { HeaderMoreDropdown } from './HeaderMoreDropdown';
import { DocumentsIcon, HeartIcon, ScaleIcon, ShieldIcon, UserIcon, LogoutIcon } from './icons';

type UserDesktopNavProps = {
  user: User;
  comparisonCount: number;
  isAuthPage: boolean;
  isErrorPage: boolean;
  navLinkClasses: string;
  onLogout: () => void;
  t: (key: string) => string;
};

export function UserDesktopNav({
  user,
  comparisonCount,
  isAuthPage,
  isErrorPage,
  navLinkClasses,
  onLogout,
  t,
}: UserDesktopNavProps) {
  const showLang = !isAuthPage && !isErrorPage;

  return (
    <>
      <CreateListingButton variant="desktop" />
      <Link href="/my-listings" className={navLinkClasses}>
        <DocumentsIcon />
        <span suppressHydrationWarning>{t('header.myListings')}</span>
      </Link>
      <Link href="/favorites" className={navLinkClasses}>
        <HeartIcon />
        <span suppressHydrationWarning>{t('header.favorites')}</span>
      </Link>
      <div className="xl:hidden">
        <HeaderMoreDropdown
          user={user}
          comparisonCount={comparisonCount}
          navLinkClasses={navLinkClasses}
          t={t}
        />
      </div>
      <Link href="/compare" className={`${navLinkClasses} hidden xl:flex`}>
        <ScaleIcon />
        <span suppressHydrationWarning>{t('header.compare')}</span>
        {comparisonCount > 0 && (
          <span className="ml-2 min-w-[1.25rem] rounded-full border border-primary-300 bg-primary-500 px-2 py-0.5 text-xs text-white text-center">
            {comparisonCount > 99 ? '99+' : comparisonCount}
          </span>
        )}
      </Link>
      <Link href="/profile" className={`${navLinkClasses} hidden xl:flex`}>
        <UserIcon />
        <span suppressHydrationWarning>{t('header.profile')}</span>
      </Link>
      {user.type === 'Admin' && (
        <AdminDesktopLink navLinkClasses={navLinkClasses} t={t} className="hidden xl:flex" />
      )}
      <button onClick={onLogout} className={navLinkClasses}>
        <LogoutIcon />
        <span suppressHydrationWarning>{t('header.logout')}</span>
      </button>
      {showLang && (
        <>
          <div className="mx-1 h-6 w-px bg-primary-700/30" />
          <LanguageSwitcher variant="desktop" context="header" />
        </>
      )}
    </>
  );
}

export function AdminDesktopLink({
  navLinkClasses,
  t,
  className = '',
}: {
  navLinkClasses: string;
  t: (key: string) => string;
  className?: string;
}) {
  return (
    <Link href="/admin" className={`${navLinkClasses} ${className}`}>
      <ShieldIcon />
      <span suppressHydrationWarning>{t('header.admin')}</span>
    </Link>
  );
}
