'use client';

import {
  authOAuthIconButtonClass,
  authOAuthIconButtonIconClass,
} from '@/app/[locale]/sign/authOAuthButtonStyles';
import { useTranslation } from '@/hooks/useTranslation';
import { FacebookIcon, Spinner } from '@/ui';

type FacebookLibraryStatus = 'probing' | 'ready' | 'unavailable';

type FacebookSignInButtonProps = {
  clientIdConfigured: boolean;
  libraryStatus: FacebookLibraryStatus;
  disabled?: boolean;
  loading?: boolean;
  onFacebookClick?: () => void;
};

export function FacebookSignInButton({
  clientIdConfigured,
  libraryStatus,
  disabled = false,
  loading = false,
  onFacebookClick,
}: FacebookSignInButtonProps) {
  const { t } = useTranslation();

  if (!clientIdConfigured || libraryStatus === 'unavailable') {
    return null;
  }

  const label = t('sign.continueWithFacebook');

  return (
    <button
      type="button"
      className={authOAuthIconButtonClass}
      disabled={disabled || loading || libraryStatus !== 'ready'}
      onClick={onFacebookClick}
      data-testid="auth-facebook"
      aria-label={label}
    >
      {loading ? (
        <Spinner
          size="sm"
          inline
          className="text-brand-facebook"
          data-testid="auth-facebook-loading"
        />
      ) : (
        <FacebookIcon className={`${authOAuthIconButtonIconClass} text-brand-facebook`} />
      )}
    </button>
  );
}
