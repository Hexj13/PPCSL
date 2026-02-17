'use client';

import Link from 'next/link';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { CreateListingButton } from '@/components/listing/CreateListingButton';

type GuestDesktopNavProps = {
  isAuthPage: boolean;
  isErrorPage: boolean;
  onSetReturnUrl: (url: string) => void;
  t: (key: string) => string;
};

const loginLinkClasses =
  'text-white font-medium h-10 text-xs md:text-xs lg:text-sm xl:text-sm hover:text-primary-100 active:text-primary-300 transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 md:gap-2 px-2 md:px-2.5 lg:px-2.5 xl:px-3 rounded-lg border-2 border-primary-300 active:border-primary-500 select-none';

export function GuestDesktopNav({
  isAuthPage,
  isErrorPage,
  onSetReturnUrl,
  t,
}: GuestDesktopNavProps) {
  const show = !isAuthPage && !isErrorPage;
  if (!show) return null;

  const handleLoginClick = () => {
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.pathname + window.location.search;
      if (currentUrl !== '/login' && currentUrl !== '/register') {
        onSetReturnUrl(currentUrl);
      }
    }
  };

  return (
    <>
      <CreateListingButton variant="desktop" />
      <Link href="/login" onClick={handleLoginClick} className={loginLinkClasses}>
        <span className="hidden lg:inline" suppressHydrationWarning>
          {t('header.login')}
        </span>
        <span className="lg:hidden" suppressHydrationWarning>
          {t('header.loginShort')}
        </span>
      </Link>
      <Link href="/register" className={loginLinkClasses}>
        <span suppressHydrationWarning>{t('header.register')}</span>
      </Link>
      <div className="h-6 w-px bg-white/20 mx-1"></div>
      <LanguageSwitcher variant="desktop" context="header" />
    </>
  );
}
