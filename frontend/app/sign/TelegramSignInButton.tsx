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

  return (
    <button
      type="button"
      className={authOAuthIconButtonClass}
      disabled={disabled || loading}
      onClick={isMock ? onDevMockClick : onTelegramClick}
      data-testid="auth-telegram"
      aria-label={t('sign.continueWithTelegram')}
    >
      {loading ? (
        <Spinner size="sm" inline className="text-[#229ED9]" data-testid="auth-telegram-loading" />
      ) : (
        <TelegramIcon className={`${authOAuthIconButtonIconClass} text-[#229ED9]`} />
      )}
    </button>
  );
}
