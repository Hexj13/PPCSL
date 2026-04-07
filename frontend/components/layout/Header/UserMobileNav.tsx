'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { isHideFooterPath, isProfilePhoneFlowPath } from '@/components/layout/header-flow-paths';
import { CreateListingButton } from '@/components/listing/CreateListingButton';
import type { User } from '@/lib/api';

import { DocumentsIcon, HeartIcon, ScaleIcon, ShieldIcon, UserIcon, LogoutIcon } from './icons';

const iconClass = 'w-4 h-4';

type UserMobileNavProps = {
  user: User;
  comparisonCount: number;
  isAuthPage: boolean;
  isErrorPage: boolean;
  mobileNavLinkClasses: string;
  onLogout: () => void;
  onClose: () => void;
  t: (key: string) => string;
};

export function UserMobileNav({
  user,
  comparisonCount,
  isAuthPage,
  isErrorPage,
  mobileNavLinkClasses,
  onLogout,
  onClose,
  t,
}: UserMobileNavProps) {
  const pathname = usePathname();
  const showLang =
    ((!isAuthPage && !isErrorPage) || (pathname === '/sign' && !isErrorPage)) &&
    !isProfilePhoneFlowPath(pathname);
  const showCreateListingInDrawer = !isHideFooterPath(pathname);

  const linkProps = { onClick: onClose, className: mobileNavLinkClasses };

  return (
    <div className="flex flex-col gap-4">
      {showCreateListingInDrawer && (
        <CreateListingButton variant="mobile" onClick={onClose} className="py-3.5!" />
      )}
      <Link href="/my-listings" {...linkProps}>
        <DocumentsIcon className={iconClass} />
        <span suppressHydrationWarning>{t('header.myListings')}</span>
      </Link>
      <Link href="/favorites" {...linkProps}>
        <HeartIcon className={iconClass} />
        <span suppressHydrationWarning>{t('header.favorites')}</span>
      </Link>
      <Link href="/compare" {...linkProps}>
        <ScaleIcon className={iconClass} />
        <span suppressHydrationWarning>{t('header.compare')}</span>
        {comparisonCount > 0 && (
          <span className="ml-2 min-w-[1.25rem] px-2 py-0.5 rounded-full bg-primary-500 border border-primary-300 text-white text-xs text-center">
            {comparisonCount > 99 ? '99+' : comparisonCount}
          </span>
        )}
      </Link>
      <Link href="/profile" {...linkProps}>
        <UserIcon className={iconClass} />
        <span suppressHydrationWarning>{t('header.profile')}</span>
      </Link>
      {user.type === 'Admin' && (
        <Link href="/admin" {...linkProps}>
          <ShieldIcon className={iconClass} />
          <span suppressHydrationWarning>{t('header.admin')}</span>
        </Link>
      )}
      <button
        type="button"
        onClick={onLogout}
        className={mobileNavLinkClasses}
        data-testid="header-mobile-logout"
      >
        <LogoutIcon className={iconClass} />
        <span suppressHydrationWarning>{t('header.logout')}</span>
      </button>
      {showLang && (
        <div className="w-full">
          <LanguageSwitcher variant="mobile" context="header" />
        </div>
      )}
    </div>
  );
}
