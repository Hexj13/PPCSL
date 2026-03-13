'use client';

import Link from 'next/link';

import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/lib/store';

interface CreateListingButtonProps {
  variant?: 'mobile' | 'desktop';
  shortLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

export function CreateListingButton({
  variant = 'desktop',
  shortLabel = false,
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
    'relative inline-flex items-center justify-center gap-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-accent text-primary-900 whitespace-nowrap select-none transition-all duration-200 shadow-none before:absolute before:inset-0 before:rounded-lg before:bg-accent/10 before:pointer-events-none hover-only:hover:text-primary-700 hover-only:hover:border-accent/80';

  const variantClasses = isMobile ? 'px-3 py-2 w-full text-[14px]' : 'h-10 px-2.5 md:px-3';

  const iconSize = isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5 md:w-4 md:h-4';

  const href = user ? '/listings/new' : '/login';

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      <svg
        className={`${iconSize} shrink-0 relative z-10`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      {isMobile ? (
        <span className="relative z-10">
          {shortLabel ? t('header.createListingShort') : t('header.createListing')}
        </span>
      ) : (
        <>
          <span className="relative z-10 hidden lg:inline">{t('header.createListing')}</span>
          <span className="relative z-10 lg:hidden">{t('header.createListingShort')}</span>
        </>
      )}
    </Link>
  );
}
