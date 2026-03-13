'use client';

import Link from 'next/link';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { CreateListingButton } from '@/components/listing/CreateListingButton';

const guestLinkClasses =
  'text-primary-900 font-medium text-sm hover-only:hover:text-primary-700 active:text-primary-700 hover-only:hover:border-primary-900 active:border-primary-900 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-1.5 px-2.5 py-3.5 rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base';

type GuestMobileNavProps = {
  isAuthPage: boolean;
  isErrorPage: boolean;
  onSetReturnUrl: (url: string) => void;
  onClose: () => void;
  t: (key: string) => string;
};

export function GuestMobileNav({
  isAuthPage,
  isErrorPage,
  onSetReturnUrl,
  onClose,
  t,
}: GuestMobileNavProps) {
  if (isErrorPage) return null;

  const handleLoginClick = () => {
    onClose();
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.pathname + window.location.search;
      if (currentUrl !== '/login' && currentUrl !== '/register') {
        onSetReturnUrl(currentUrl);
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {!isAuthPage && (
        <CreateListingButton variant="mobile" onClick={onClose} className="py-3.5!" />
      )}
      {!isAuthPage && (
        <>
          <Link href="/login" onClick={handleLoginClick} className={guestLinkClasses}>
            <span suppressHydrationWarning>{t('header.login')}</span>
          </Link>
          <Link href="/register" onClick={onClose} className={guestLinkClasses}>
            <span suppressHydrationWarning>{t('header.register')}</span>
          </Link>
        </>
      )}
      {!isAuthPage && (
        <>
          <div>
            <div className="flex justify-center">
              <LanguageSwitcher variant="mobile" context="header" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
