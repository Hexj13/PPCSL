'use client';

import { Suspense } from 'react';

import { useTranslation } from '@/hooks/useTranslation';

import { VerifyPhoneCodeForm } from './VerifyPhoneCodeForm';
import { useVerifyPhonePage } from './useVerifyPhonePage';

function VerifyPhoneContent() {
  const { t } = useTranslation();
  const {
    code,
    error,
    isSubmitting,
    phoneNumber,
    resendAttempts,
    resendCooldown,
    isVerificationBlocked,
    inputRefs,
    handleCodeChange,
    handleKeyDown,
    handlePaste,
    handleSubmit,
    handleBack,
    handleResend,
  } = useVerifyPhonePage();

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12" data-testid="verify-phone-page">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center text-primary-900">
        {t('verifyPhone.title')}
      </h1>
      <VerifyPhoneCodeForm
        code={code}
        error={error}
        isSubmitting={isSubmitting}
        phoneNumber={phoneNumber}
        resendAttempts={resendAttempts}
        resendCooldown={resendCooldown}
        isVerificationBlocked={isVerificationBlocked}
        inputRefs={inputRefs}
        onCodeChange={handleCodeChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onSubmit={handleSubmit}
        onBack={handleBack}
        onResend={() => void handleResend()}
      />
    </div>
  );
}

function VerifyPhoneFallback() {
  const { t } = useTranslation();
  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <div className="card p-6 md:p-8 text-center">
        <div className="mb-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-700 border-t-transparent"></div>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-primary-700">{t('common.loading')}</h1>
      </div>
    </div>
  );
}

export default function VerifyPhonePage() {
  return (
    <Suspense fallback={<VerifyPhoneFallback />}>
      <VerifyPhoneContent />
    </Suspense>
  );
}
