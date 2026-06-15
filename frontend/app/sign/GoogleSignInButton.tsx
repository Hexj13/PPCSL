'use client';

import type { RefObject } from 'react';

import {
  authOAuthIconButtonClass,
  authOAuthIconButtonIconClass,
} from '@/app/sign/authOAuthButtonStyles';
import { useTranslation } from '@/hooks/useTranslation';
import { GoogleIcon, Spinner } from '@/ui';

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
  const { t } = useTranslation();

  if (!clientIdConfigured) {
    return null;
  }

  return (
    <div
      className={`${authOAuthIconButtonClass} ${disabled ? 'opacity-50' : ''}`}
      data-testid="auth-google-block"
      aria-disabled={disabled}
      aria-label={t('sign.continueWithGoogle')}
    >
      {loading ? (
        <Spinner size="sm" inline className="text-[#3c4043]" data-testid="auth-google-loading" />
      ) : (
        <GoogleIcon className={authOAuthIconButtonIconClass} />
      )}
      <div
        ref={containerRef}
        className={`auth-google-icon-overlay absolute inset-0 opacity-0 ${loading || disabled ? 'pointer-events-none' : ''}`}
        aria-hidden={disabled || loading}
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
