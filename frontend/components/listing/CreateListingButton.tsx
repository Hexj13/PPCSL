'use client';

import Link from 'next/link';

import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/lib/store';

interface CreateListingButtonProps {
  variant?: 'mobile' | 'desktop';
  className?: string;
  onClick?: () => void;
}

export function CreateListingButton({
  variant = 'desktop',
  className = '',
  onClick,
}: CreateListingButtonProps) {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const handleSetReturnUrl = (url: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('returnUrl', url);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    if (!user) {
      handleSetReturnUrl('/listings/new');
    }
  };

  const isMobile = variant === 'mobile';

  const baseClasses =
    'text-white font-medium transition-all duration-200 whitespace-nowrap flex items-center justify-center border-2 border-accent select-none hover:text-accent-100 active:text-accent-100';

  const variantClasses = isMobile
    ? 'text-sm gap-1.5 px-2.5 py-2 rounded-lg w-full'
    : 'h-10 text-xs md:text-xs lg:text-xs xl:text-sm gap-1.5 md:gap-2 px-2 md:px-2.5 lg:px-2.5 xl:px-3 rounded-lg';

  const iconSize = isMobile ? 'w-4 h-4' : 'w-3 h-3 md:w-3.5 md:h-3.5';

  const href = user ? '/listings/new' : '/login';

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      <svg
        className={`${iconSize} flex-shrink-0`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      {isMobile ? (
        <span>{t('header.createListing')}</span>
      ) : (
        <>
          <span className="hidden lg:inline">{t('header.createListing')}</span>
          <span className="lg:hidden">{t('header.createListingShort')}</span>
        </>
      )}
    </Link>
  );
}
