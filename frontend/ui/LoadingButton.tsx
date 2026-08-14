import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { useLoadingState } from '@/hooks/useLoadingState';

import { Spinner } from './Spinner';

export interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
  showSpinner?: boolean;
  spinnerSize?: 'sm' | 'md' | 'lg';
  loaderShowDelay?: number;
  loaderMinDisplayTime?: number;
  loaderImmediate?: boolean;
  loaderInstant?: boolean;
}

function ManagedLoadingButton({
  loading,
  showSpinner,
  spinnerSize,
  loaderShowDelay,
  loaderMinDisplayTime,
  loaderImmediate,
  disabled,
  className,
  children,
  ...props
}: Omit<LoadingButtonProps, 'loaderInstant' | 'loadingText'> & { loading: boolean }) {
  const { visible: showLoading } = useLoadingState({
    isLoading: loading,
    showDelay: loaderShowDelay,
    minDisplayTime: loaderMinDisplayTime,
    immediate: loaderImmediate,
  });

  const isDisabled = Boolean(disabled || showLoading);
  const showSpinnerElement = (showSpinner ?? true) && showLoading;

  return (
    <button
      disabled={isDisabled}
      aria-busy={showLoading || undefined}
      className={`relative flex items-center justify-center gap-2 ${className ?? ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      <span className={showSpinnerElement ? 'invisible' : undefined}>{children}</span>
      {showSpinnerElement ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={spinnerSize ?? 'sm'} inline />
        </span>
      ) : null}
    </button>
  );
}

export function LoadingButton({
  loading = false,
  loadingText: _loadingText,
  children,
  showSpinner = true,
  spinnerSize = 'sm',
  loaderShowDelay,
  loaderMinDisplayTime,
  loaderImmediate,
  loaderInstant = false,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  if (loaderInstant) {
    const isDisabled = Boolean(disabled || loading);
    const showSpinnerElement = showSpinner && loading;
    return (
      <button
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={`relative flex items-center justify-center gap-2 ${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        {...props}
      >
        <span className={showSpinnerElement ? 'invisible' : undefined}>{children}</span>
        {showSpinnerElement ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner size={spinnerSize} inline />
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <ManagedLoadingButton
      loading={loading}
      showSpinner={showSpinner}
      spinnerSize={spinnerSize}
      loaderShowDelay={loaderShowDelay}
      loaderMinDisplayTime={loaderMinDisplayTime}
      loaderImmediate={loaderImmediate}
      disabled={disabled}
      className={className}
      {...props}
    >
      {children}
    </ManagedLoadingButton>
  );
}
