'use client';

import Link from 'next/link';

import { useI18n } from '@/components/providers/I18nProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { localizedHref } from '@/lib/localized-href';
import { buildSignInHref } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';

const HEADER_CTA_SURFACE_BASE =
  'relative inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/90 border-2 border-accent whitespace-nowrap select-none transition-all duration-200 shadow-none before:absolute before:inset-0 before:rounded-lg before:bg-accent/10 before:pointer-events-none hover-only:hover:border-accent/80';

export const HEADER_CTA_SURFACE_CLASSES = `${HEADER_CTA_SURFACE_BASE} text-primary-700 hover-only:hover:text-primary-900`;

export const HEADER_CTA_PROMOTE_SURFACE_CLASSES = `${HEADER_CTA_SURFACE_BASE} text-text-secondary hover-only:hover:text-text-primary`;

export const LISTING_ACTION_CTA_CARD_SURFACE =
  "relative border-2 border-accent bg-white/55 text-primary-700 shadow-none before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-accent/5 before:content-[''] hover-only:hover:border-accent/80 hover-only:hover:text-primary-900 hover-only:hover:shadow-sm active:opacity-[0.97] focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover-only:hover:border-accent disabled:hover-only:hover:shadow-none";

export const HEADER_CTA_BUTTON_CLASSES = `${HEADER_CTA_SURFACE_CLASSES} text-xs md:text-sm font-semibold`;

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
  const { locale } = useI18n();

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const isMobile = variant === 'mobile';

  const baseClasses = HEADER_CTA_BUTTON_CLASSES;

  const variantClasses = isMobile ? 'px-3 py-2 w-full text-[14px]' : 'h-10 px-2.5 md:px-3';

  const iconSize = isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5 md:w-4 md:h-4';

  const newListingPath = '/listings/new';
  const href = user
    ? localizedHref(newListingPath, locale)
    : buildSignInHref(newListingPath, locale);

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
