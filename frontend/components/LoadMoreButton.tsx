'use client';

import { ReactNode } from 'react';

import { useTranslation } from '@/hooks/useTranslation';

interface LoadMoreButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  wrapperClassName?: string;
  variant?: 'default' | 'inline';
}

export function LoadMoreButton({
  onClick,
  disabled = false,
  className = '',
  children,
  wrapperClassName = '',
  variant = 'default',
}: LoadMoreButtonProps) {
  const { t } = useTranslation();

  const buttonClasses =
    variant === 'inline'
      ? 'text-primary-500 font-medium text-base hover:text-primary-700 hover:border-primary-700 active:text-primary-700 active:border-primary-700 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-primary-500 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed'
      : 'text-primary-500 font-medium text-sm md:text-base hover:text-primary-700 hover:border-primary-700 active:text-primary-700 active:border-primary-700 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-8 py-3 text-lg rounded-lg border-2 border-primary-500 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed';

  const content = children || t('listings.loadMore');

  if (variant === 'inline') {
    return (
      <button onClick={onClick} disabled={disabled} className={`${buttonClasses} ${className}`}>
        {content}
      </button>
    );
  }

  return (
    <div className={`flex justify-center pt-8 pb-0 ${wrapperClassName}`}>
      <button onClick={onClick} disabled={disabled} className={`${buttonClasses} ${className}`}>
        {content}
      </button>
    </div>
  );
}
