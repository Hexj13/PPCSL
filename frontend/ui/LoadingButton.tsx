import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { useLoadingState } from '@/hooks/useLoadingState';

import { Spinner } from './Spinner';

export interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
  showSpinner?: boolean;
  spinnerSize?: 'sm' | 'md' | 'lg';
}

export function LoadingButton({
  loading = false,
  loadingText: _loadingText,
  children,
  showSpinner = true,
  spinnerSize = 'sm',
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  const { visible: showLoading } = useLoadingState({
    isLoading: loading,
    showDelay: 200,
    minDisplayTime: 1000,
  });

  const isDisabled = Boolean(disabled || showLoading);

  const showSpinnerElement = showSpinner && showLoading;

  return (
    <button
      disabled={isDisabled}
      className={`flex items-center justify-center ${showSpinnerElement ? '' : 'gap-2'} ${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      {showSpinnerElement ? <Spinner size={spinnerSize} inline /> : children}
    </button>
  );
}
