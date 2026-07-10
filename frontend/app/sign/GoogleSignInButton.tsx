'use client';

import type { RefObject } from 'react';

import { Spinner } from '@/ui';

type GoogleSignInButtonProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  clientIdConfigured: boolean;
  disabled?: boolean;
  loading?: boolean;
};

export function GoogleSignInButton({
  containerRef,
  clientIdConfigured,
  disabled = false,
  loading = false,
}: GoogleSignInButtonProps) {
  if (!clientIdConfigured) {
    return null;
  }

  return (
    <div
      className={`relative flex h-10 w-10 items-center justify-center ${loading ? 'pointer-events-none' : ''}`}
      data-testid="auth-google-block"
    >
      {loading ? (
        <Spinner size="sm" inline className="text-dark-500" data-testid="auth-google-loading" />
      ) : null}
      <div
        ref={containerRef}
        data-testid="auth-google-gis-container"
        className={`auth-google-icon-button flex items-center justify-center ${loading ? 'invisible absolute inset-0' : ''} ${disabled ? 'pointer-events-none' : ''}`}
        aria-hidden={disabled || loading}
        inert={disabled || loading}
      />
      {disabled && !loading ? (
        <div
          className="absolute inset-0 z-10 cursor-not-allowed"
          data-testid="auth-google-disabled-overlay"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
