'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import {
  isHideFooterPath,
  isProfilePhoneFlowPath,
  isSignRoutePathname,
} from '@/components/layout/header-flow-paths';
import { CreateListingButton } from '@/components/listing/CreateListingButton';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { prepareScrollLockReleaseToTop } from '@/hooks/useScrollLock';
import type { User } from '@/lib/api';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

import { HeaderListingsNavLink } from './HeaderListingsNavLink';

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
  const { href } = useLocalizedNavigation();
  const pathname = usePathname();
  const showLang =
    ((!isAuthPage && !isErrorPage) || (isSignRoutePathname(pathname) && !isErrorPage)) &&
    !isProfilePhoneFlowPath(pathname);
  const showCreateListingInDrawer = !isHideFooterPath(pathname);

  const handleNavClick = (targetRestPath?: string) => {
    prepareScrollLockReleaseToTop();
    onClose();
    if (targetRestPath && stripLocalePrefixFromPathname(pathname).restPath === targetRestPath) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const linkProps = { onClick: () => handleNavClick(), className: mobileNavLinkClasses };

  return (
    <div className="flex flex-col gap-4">
      {showCreateListingInDrawer && (
        <CreateListingButton variant="mobile" drawerCta onClick={onClose} />
      )}
      <HeaderListingsNavLink className={mobileNavLinkClasses} onNavigate={onClose} t={t} />
      <Link href={href('/my-listings')} {...linkProps}>
        <span suppressHydrationWarning>{t('header.myListings')}</span>
      </Link>
      <Link
        href={href('/favorites')}
        className={mobileNavLinkClasses}
        onClick={() => handleNavClick('/favorites')}
      >
        <span suppressHydrationWarning>{t('header.favorites')}</span>
      </Link>
      <Link
        href={href('/compare')}
        className={mobileNavLinkClasses}
        onClick={() => handleNavClick('/compare')}
      >
        <span suppressHydrationWarning>{t('header.compare')}</span>
        {comparisonCount > 0 && (
          <span className="ml-2 min-w-[1.25rem] px-2 py-0.5 rounded-full bg-primary-500 border border-primary-300 text-white text-xs text-center">
            {comparisonCount > 99 ? '99+' : comparisonCount}
          </span>
        )}
      </Link>
      {user.type !== 'Individual' && (
        <Link
          href={href('/partners')}
          className={mobileNavLinkClasses}
          onClick={() => handleNavClick('/partners')}
        >
          <span suppressHydrationWarning>{t('header.forBusiness')}</span>
        </Link>
      )}
      <Link href={href('/profile')} {...linkProps}>
        <span suppressHydrationWarning>{t('header.profile')}</span>
      </Link>
      {user.type === 'Admin' && (
        <Link href={href('/admin')} {...linkProps}>
          <span suppressHydrationWarning>{t('header.admin')}</span>
        </Link>
      )}
      <button
        type="button"
        onClick={onLogout}
        className={mobileNavLinkClasses}
        data-testid="header-mobile-logout"
      >
        <span suppressHydrationWarning>{t('header.logout')}</span>
      </button>
      {showLang && (
        <div className="w-full border-t border-primary-700 pt-4">
          <LanguageSwitcher variant="mobile" context="header" />
        </div>
      )}
    </div>
  );
}
