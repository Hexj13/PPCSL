'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';

import { Modal } from './Modal';

interface SmsVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (_code: string) => void;
  phoneNumber?: string;
}

export function SmsVerificationModal({
  isOpen,
  onClose,
  onVerify,
  phoneNumber,
}: SmsVerificationModalProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError('');
      setIsSubmitting(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) {
      return;
    }

    const newCode = code.split('');
    if (value.length === 1) {
      newCode[index] = value;
      setCode(newCode.join('').padEnd(6, ' ').slice(0, 6));
      setError('');

      if (index < 5 && value) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (value.length === 0) {
      newCode[index] = '';
      setCode(newCode.join('').trimEnd());
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }

    const updatedCode = newCode.join('').trimEnd();
    if (updatedCode.length === 6) {
      void validateAndSubmit(updatedCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const digitsOnly = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digitsOnly.length > 0) {
      setCode(digitsOnly.padEnd(6, ' ').slice(0, 6));
      setError('');

      const filledIndex = Math.min(digitsOnly.length - 1, 5);
      inputRefs.current[filledIndex]?.focus();

      if (digitsOnly.length === 6) {
        void validateAndSubmit(digitsOnly);
      }
    }
  };

  const validateAndSubmit = async (codeToValidate: string) => {
    if (codeToValidate.length !== 6) {
      setError(t('smsVerification.codeRequired'));
      return;
    }

    if (!/^\d{6}$/.test(codeToValidate)) {
      setError(t('smsVerification.codeDigitsOnly'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    if (codeToValidate === '000000') {
      setTimeout(() => {
        onVerify(codeToValidate);
        setIsSubmitting(false);
      }, 500);
    } else {
      setError(t('smsVerification.codeInvalid'));
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim();
    if (trimmedCode.length === 6) {
      void validateAndSubmit(trimmedCode);
    } else {
      setError(t('smsVerification.enterFullCode'));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('smsVerification.title')} size="small">
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-text-secondary mb-2">
            {t('smsVerification.codeSentTo')}{' '}
            {phoneNumber && (
              <span className="font-semibold text-text-secondary">{phoneNumber}</span>
            )}
          </p>
          <p className="text-sm text-text-secondary">{t('smsVerification.enterCode')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center gap-2 md:gap-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={code[index] || ''}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={isSubmitting}
                className={`w-12 h-14 md:w-14 md:h-16 text-center text-2xl md:text-3xl font-bold bg-bg-secondary border-2 rounded-lg transition-all duration-200 focus:outline-none focus:border-primary-700 ${
                  error
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-divider focus:border-primary-700'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-text'} text-white`}
                autoComplete="off"
              />
            ))}
          </div>

          {error && (
            <div className="text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.back')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || code.trim().length !== 6}
              className="flex-1 text-primary-700 font-medium text-sm md:text-base hover:text-primary-900 hover:border-primary-900 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 rounded-lg border-2 border-primary-700 bg-primary-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('smsVerification.verifying') : t('smsVerification.verify')}
            </button>
          </div>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setCode('');
              setError('');
              inputRefs.current[0]?.focus();
            }}
            disabled={isSubmitting}
            className="text-sm text-primary-700 hover:text-primary-600 transition-colors disabled:opacity-50"
          >
            {t('smsVerification.resendCode')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
