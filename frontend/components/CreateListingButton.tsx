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
    'text-white font-medium transition-all duration-200 whitespace-nowrap flex items-center border-2 border-accent select-none hover:text-accent-100 active:text-accent-100';

  const variantClasses = isMobile
    ? 'text-xs gap-1.5 px-2.5 py-2 rounded-lg'
    : 'text-xs md:text-sm lg:text-base gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg';

  const iconSize = isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5 md:w-4 md:h-4';

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
          <span className="hidden xl:inline">{t('header.createListing')}</span>
          <span className="xl:hidden">{t('header.createListingShort')}</span>
        </>
      )}
    </Link>
  );
}
