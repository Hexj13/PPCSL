'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { smsResendCooldownButtonLabel } from '@/lib/utils';
import { LoadingButton } from '@/ui';

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
            {phoneNumber && <span className="font-semibold text-primary-700">{phoneNumber}</span>}
          </p>
          <p className="text-sm">{t('verifyPhone.enterCode')}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" data-testid="verify-phone-form">
          <div className="flex justify-center gap-2 md:gap-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="relative">
                <input
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={code[index] || ''}
                  onChange={(e) => onCodeChange(index, e.target.value)}
                  onKeyDown={(e) => onKeyDown(index, e)}
                  onPaste={onPaste}
                  disabled={isSubmitting}
                  className={`w-12 h-14 md:w-14 md:h-16 text-center text-2xl md:text-3xl font-bold bg-bg-secondary border-2 rounded-lg transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-primary-700 focus:border-primary-700 ${
                    error
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-primary-700/30 focus:border-primary-700'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-text'} text-primary-900`}
                  style={{
                    caretColor: 'transparent',
                    fontFamily: "'Digital-7', monospace",
                    letterSpacing: '0.05em',
                  }}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  autoFocus={index === 0} // eslint-disable-line jsx-a11y/no-autofocus
                  data-testid={`verify-phone-code-input-${index}`}
                />
                {!code[index] && (
                  <span
                    className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-500 opacity-60 select-none text-2xl md:text-3xl font-bold"
                    style={{
                      fontFamily: "'Digital-7', monospace",
                      letterSpacing: '0.05em',
                    }}
                  >
                    0
                  </span>
                )}
              </div>
            ))}
          </div>

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
              className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-primary-600 hover-only:hover:border-primary-700 bg-primary-500/20 text-primary-800 font-semibold text-base hover-only:hover:bg-primary-500/30 transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
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
