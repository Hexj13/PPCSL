'use client';

import { useEffect, useRef, useState } from 'react';

import { Modal } from './Modal';

interface SmsVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => void;
  phoneNumber?: string;
}

export function SmsVerificationModal({
  isOpen,
  onClose,
  onVerify,
  phoneNumber,
}: SmsVerificationModalProps) {
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
      validateAndSubmit(updatedCode);
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
        validateAndSubmit(digitsOnly);
      }
    }
  };

  const validateAndSubmit = async (codeToValidate: string) => {
    if (codeToValidate.length !== 6) {
      setError('Кодот мора да содржи точно 6 цифри');
      return;
    }

    if (!/^\d{6}$/.test(codeToValidate)) {
      setError('Кодот мора да содржи само цифри');
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
      setError('Невалиден код. Обидете се повторно.');
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim();
    if (trimmedCode.length === 6) {
      validateAndSubmit(trimmedCode);
    } else {
      setError('Внесете го целосниот код');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Потврда на телефон" size="small">
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-gray-300 mb-2">
            Испратениот код на телефон{' '}
            {phoneNumber && <span className="font-semibold text-white">{phoneNumber}</span>}
          </p>
          <p className="text-sm text-gray-400">Внесете го 6-цифрениот код од СМС пораката</p>
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
                className={`w-12 h-14 md:w-14 md:h-16 text-center text-2xl md:text-3xl font-bold bg-bg-light border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  error
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-primary-500/30 focus:border-primary-500'
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
              Назад
            </button>
            <button
              type="submit"
              disabled={isSubmitting || code.trim().length !== 6}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? 'Проверување...' : 'Потврди'}
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
            className="text-sm text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50"
          >
            Испрати нов код
          </button>
        </div>
      </div>
    </Modal>
  );
}
