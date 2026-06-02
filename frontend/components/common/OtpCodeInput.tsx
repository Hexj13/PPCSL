'use client';

import {
  useId,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from 'react';

type OtpCodeInputProps = {
  code: string[];
  error?: string;
  disabled?: boolean;
  inputRefs: RefObject<(HTMLInputElement | null)[]>;
  onCodeChange: (index: number, value: string) => void;
  onKeyDown: (index: number, event: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  autoFocusIndex?: number;
  testIdPrefix?: string;
  variant?: 'default' | 'digital';
  showError?: boolean;
};

const DIGIT_STYLE: CSSProperties = {
  caretColor: 'transparent',
  fontFamily: "'Digital-7', monospace",
  letterSpacing: '0.05em',
};

export function OtpCodeInput({
  code,
  error,
  disabled = false,
  inputRefs,
  onCodeChange,
  onKeyDown,
  onPaste,
  autoFocusIndex = 0,
  testIdPrefix = 'otp-code-input',
  variant = 'default',
  showError = true,
}: OtpCodeInputProps) {
  const errorId = useId();
  const isDigital = variant === 'digital';
  const gapClass = isDigital ? 'gap-2 md:gap-3' : 'gap-2 sm:gap-3';

  const defaultInputClass = `w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 rounded-lg bg-bg-base text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
    error ? 'border-semantic-error' : 'border-primary-700'
  }`;

  const digitalInputClass = `w-12 h-14 md:w-14 md:h-16 text-center text-2xl md:text-3xl font-bold bg-bg-secondary border-2 rounded-lg transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-primary-700 focus:border-primary-700 ${
    error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-primary-700/30 focus:border-primary-700'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'} text-primary-900`;

  return (
    <div>
      <div
        className={`flex justify-center ${gapClass}`}
        role="group"
        aria-describedby={error && showError ? errorId : undefined}
      >
        {code.map((digit, index) => (
          <div key={index} className={isDigital ? 'relative' : undefined}>
            <input
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={digit}
              disabled={disabled}
              onChange={(e) => onCodeChange(index, e.target.value)}
              onKeyDown={(e) => onKeyDown(index, e)}
              onPaste={onPaste}
              autoFocus={index === autoFocusIndex} // eslint-disable-line jsx-a11y/no-autofocus -- OTP fields focus the active digit by design
              data-testid={`${testIdPrefix}-${index}`}
              className={isDigital ? digitalInputClass : defaultInputClass}
              style={isDigital ? DIGIT_STYLE : undefined}
              aria-label={`Digit ${index + 1}`}
            />
            {isDigital && !digit && (
              <span
                className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-500 opacity-60 select-none text-2xl md:text-3xl font-bold"
                style={DIGIT_STYLE}
              >
                0
              </span>
            )}
          </div>
        ))}
      </div>
      {showError && error ? (
        <p id={errorId} className="text-semantic-error text-sm mt-3 text-center" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
