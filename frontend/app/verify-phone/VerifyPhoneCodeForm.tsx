'use client';

import { OtpCodeInput } from '@/components/common/OtpCodeInput';
import { useTranslation } from '@/hooks/useTranslation';
import { formatPhoneForDisplay } from '@/lib/phone';
import { smsResendCooldownButtonLabel } from '@/lib/utils';
import { LoadingButton, AUTH_MODAL_CONFIRM_BUTTON_CLASSES } from '@/ui';

type VerifyPhoneCodeFormProps = {
  code: string[];
  error: string;
  isSubmitting: boolean;
  phoneNumber: string;
  resendAttempts: number;
  resendCooldown: number;
  isVerificationBlocked: boolean;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onCodeChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onResend: () => void;
};

export function VerifyPhoneCodeForm({
  code,
  error,
  isSubmitting,
  phoneNumber,
  resendAttempts,
  resendCooldown,
  isVerificationBlocked,
  inputRefs,
  onCodeChange,
  onKeyDown,
  onPaste,
  onSubmit,
  onBack,
  onResend,
}: VerifyPhoneCodeFormProps) {
  const { t } = useTranslation();

  return (
    <div className="card p-6 md:p-8">
      <div className="space-y-6">
        <div className="text-center text-primary-900">
          <p className="mb-2">
            {t('verifyPhone.codeSentTo')}{' '}
            {phoneNumber && (
              <span className="font-semibold text-primary-700">
                {formatPhoneForDisplay(phoneNumber)}
              </span>
            )}
          </p>
          <p className="text-sm">{t('verifyPhone.enterCode')}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" data-testid="verify-phone-form">
          <OtpCodeInput
            code={code}
            error={error}
            disabled={isSubmitting}
            inputRefs={inputRefs}
            onCodeChange={onCodeChange}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            variant="digital"
            showError={false}
            testIdPrefix="verify-phone-code-input"
          />

          {error && (
            <div className="text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-gray-500/40 hover-only:hover:border-gray-500/60 bg-gray-500/20 text-text-secondary font-semibold text-base hover-only:hover:text-text-primary transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="verify-phone-back"
            >
              {t('common.back')}
            </button>
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              disabled={code.join('').trim().length !== 6 || isVerificationBlocked}
              className={AUTH_MODAL_CONFIRM_BUTTON_CLASSES}
              data-testid="verify-phone-submit"
            >
              {isVerificationBlocked ? t('smsVerification.blocked') : t('smsVerification.verify')}
            </LoadingButton>
          </div>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={onResend}
            disabled={isSubmitting || resendCooldown > 0 || resendAttempts >= 2}
            className="text-sm text-primary-700 hover-only:hover:text-primary-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendAttempts >= 2
              ? t('smsVerification.maxResendAttempts')
              : resendCooldown > 0
                ? smsResendCooldownButtonLabel(resendCooldown, t, {
                    withSeconds: 'smsVerification.resendCodeWithCooldown',
                    withMinutes: 'smsVerification.resendCodeWithCooldownMinutes',
                  })
                : t('smsVerification.resendCode')}
          </button>
        </div>
      </div>
    </div>
  );
}
