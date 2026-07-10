'use client';

import {
  authOAuthIconButtonClass,
  authOAuthIconButtonIconClass,
} from '@/app/sign/authOAuthButtonStyles';
import { useTranslation } from '@/hooks/useTranslation';
import { Spinner, TelegramIcon } from '@/ui';

type TelegramLibraryStatus = 'probing' | 'ready' | 'unavailable' | 'mock';

type TelegramSignInButtonProps = {
  clientIdConfigured: boolean;
  libraryStatus: TelegramLibraryStatus;
  disabled?: boolean;
  loading?: boolean;
  onDevMockClick?: () => void;
  onTelegramClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export function TelegramSignInButton({
  clientIdConfigured,
  libraryStatus,
  disabled = false,
  loading = false,
  onDevMockClick,
  onTelegramClick,
}: TelegramSignInButtonProps) {
  const { t } = useTranslation();

  if (!clientIdConfigured || libraryStatus === 'unavailable') {
    return null;
  }

  const isMock = libraryStatus === 'mock';
  const label = t('sign.continueWithTelegram');

  return (
    <button
      type="button"
      className={authOAuthIconButtonClass}
      disabled={disabled || loading}
      onClick={isMock ? onDevMockClick : onTelegramClick}
      data-testid="auth-telegram"
      aria-label={label}
    >
      {loading ? (
        <Spinner
          size="sm"
          inline
          className="text-brand-telegram"
          data-testid="auth-telegram-loading"
        />
      ) : (
        <TelegramIcon className={`${authOAuthIconButtonIconClass} text-brand-telegram`} />
      )}
    </button>
  );
}
