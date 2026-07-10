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
      className={`relative h-10 w-10 min-w-[40px] max-w-[40px] shrink-0 overflow-hidden rounded ${loading ? 'pointer-events-none' : ''}`}
      data-testid="auth-google-block"
    >
      {loading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center border border-divider bg-bg-partnerLogo">
          <Spinner size="sm" inline className="text-dark-500" data-testid="auth-google-loading" />
        </div>
      ) : null}
      <div
        ref={containerRef}
        data-testid="auth-google-gis-container"
        className={`auth-google-icon-button absolute inset-0 h-10 w-10 overflow-hidden rounded ${loading ? 'invisible' : ''} ${disabled ? 'pointer-events-none' : ''}`}
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
