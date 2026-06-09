'use client';

import type { CSSProperties, ReactNode, Ref } from 'react';

import { useTranslation } from '@/hooks/useTranslation';

interface LoadMoreButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  buttonRef?: Ref<HTMLButtonElement>;
  style?: CSSProperties;
  children?: ReactNode;
  wrapperClassName?: string;
  variant?: 'default' | 'inline';
}

export function LoadMoreButton({
  onClick,
  disabled = false,
  loading = false,
  className = '',
  buttonRef,
  style,
  children,
  wrapperClassName = '',
  variant = 'default',
}: LoadMoreButtonProps) {
  const { t } = useTranslation();

  const buttonClasses =
    variant === 'inline'
      ? 'text-primary-700 font-medium text-base hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 h-[48px] rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed'
      : 'text-primary-700 font-medium text-sm md:text-base hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-8 py-3 text-lg rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed';

  const label = children || t('listings.loadMore');

  const inner = (
    <span className="relative inline-flex items-center justify-center">
      <span className={`inline-flex items-center gap-2 ${loading ? 'invisible' : ''}`}>
        {label}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
        </span>
      )}
    </span>
  );

  if (variant === 'inline') {
    return (
      <button
        ref={buttonRef}
        onClick={onClick}
        disabled={disabled || loading}
        style={style}
        className={`${buttonClasses} ${className}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={`flex justify-center py-8 ${wrapperClassName}`}>
      <button
        ref={buttonRef}
        onClick={onClick}
        disabled={disabled || loading}
        style={style}
        className={`${buttonClasses} ${className}`}
      >
        {inner}
      </button>
    </div>
  );
}
