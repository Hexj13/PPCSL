'use client';

import Link from 'next/link';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { CreateListingButton } from '@/components/listing/CreateListingButton';
import type { User } from '@/lib/api';

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
        <span className="hidden xl:inline" suppressHydrationWarning>
          {t('header.myListings')}
        </span>
        <span className="xl:hidden" suppressHydrationWarning>
          {t('header.myListingsShort')}
        </span>
      </Link>
      <Link href="/favorites" className={navLinkClasses}>
        <HeartIcon />
        <span className="hidden lg:inline" suppressHydrationWarning>
          {t('header.favorites')}
        </span>
        <span className="lg:hidden" suppressHydrationWarning>
          {t('header.favorites')}
        </span>
      </Link>
      <Link href="/compare" className={navLinkClasses}>
        <ScaleIcon />
        <span className="hidden lg:inline" suppressHydrationWarning>
          {t('header.compare')}
        </span>
        <span className="lg:hidden" suppressHydrationWarning>
          {t('header.compare')}
        </span>
        {comparisonCount > 0 && (
          <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500 border border-primary-300 text-white text-xs">
            {comparisonCount}
          </span>
        )}
      </Link>
      {user.type === 'Admin' && <AdminDesktopLink navLinkClasses={navLinkClasses} t={t} />}
      <Link href="/profile" className={navLinkClasses}>
        <UserIcon />
        <span suppressHydrationWarning>{t('header.profile')}</span>
      </Link>
      <button onClick={onLogout} className={navLinkClasses}>
        <LogoutIcon />
        <span className="hidden xl:inline" suppressHydrationWarning>
          {t('header.logout')}
        </span>
        <span className="xl:hidden" suppressHydrationWarning>
          {t('header.logoutShort')}
        </span>
      </button>
      {showLang && (
        <>
          <div className="h-6 w-px bg-white/20 mx-1"></div>
          <LanguageSwitcher variant="desktop" context="header" />
        </>
      )}
    </>
  );
}

export function AdminDesktopLink({
  navLinkClasses,
  t,
}: {
  navLinkClasses: string;
  t: (key: string) => string;
}) {
  return (
    <Link href="/admin" className={navLinkClasses}>
      <ShieldIcon />
      <span className="hidden lg:inline" suppressHydrationWarning>
        {t('header.admin')}
      </span>
      <span className="lg:hidden" suppressHydrationWarning>
        {t('header.admin')}
      </span>
    </Link>
  );
}
