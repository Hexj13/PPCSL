'use client';

import { useState } from 'react';

import type { PasswordValidationRule } from '@/app/reset-password/utils';
import { getPasswordValidationRules } from '@/app/reset-password/utils';
import type { useTranslation } from '@/hooks/useTranslation';
import { InfoBlock } from '@/ui';

type TranslationFn = ReturnType<typeof useTranslation>['t'];

function PasswordInputWithToggle({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete,
  show,
  onToggle,
  maxLength,
  rules,
  passwordManagerIgnore,
  readOnlyUntilFocused,
  disabled,
  dataTestId,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  show: boolean;
  onToggle: () => void;
  maxLength?: number;
  rules?: PasswordValidationRule[];
  passwordManagerIgnore?: boolean;
  readOnlyUntilFocused?: boolean;
  disabled?: boolean;
  dataTestId?: string;
}) {
  const [focusUnlocked, setFocusUnlocked] = useState(false);
  const readOnly = Boolean(disabled || (readOnlyUntilFocused && !focusUnlocked));

  return (
    <div className="w-full min-w-0">
      <label className="block text-sm font-semibold mb-2 text-primary-900" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          maxLength={maxLength}
          readOnly={readOnly}
          disabled={disabled}
          data-testid={dataTestId}
          onFocus={() => {
            if (disabled) return;
            if (readOnlyUntilFocused && !focusUnlocked) {
              queueMicrotask(() => setFocusUnlocked(true));
            }
          }}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          {...(passwordManagerIgnore
            ? ({ 'data-1p-ignore': true, 'data-lpignore': 'true' } as const)
            : {})}
          className="input-field w-full pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-900 hover-only:hover:text-primary-700 transition-colors"
          tabIndex={-1}
        >
          {show ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </button>
      </div>
      {rules && rules.length > 0 ? (
        <div className="mt-2 space-y-1 pt-1">
          {rules.map((rule, index) => (
            <div key={index} className="flex items-center gap-2">
              {rule.isValid ? (
                <svg
                  className="w-3 h-3 text-primary-900 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3 h-3 text-gray-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              <p
                className={`text-[10px] leading-tight ${
                  rule.isValid ? 'text-primary-700' : 'text-gray-400'
                } transition-colors`}
              >
                {rule.text}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ProfilePasswordSection({
  t,
  hasPassword,
  currentPassword,
  newPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
}: {
  t: TranslationFn;
  hasPassword: boolean;
  currentPassword: string;
  newPassword: string;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
}) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const newPasswordRules = getPasswordValidationRules(newPassword, t);

  return (
    <div
      className="card p-4 md:p-6 lg:p-8"
      data-testid={hasPassword ? 'profile-password-change-section' : 'profile-password-set-section'}
    >
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t(hasPassword ? 'profile.passwordChangeTitle' : 'profile.passwordSetTitle')}
      </h2>
      {!hasPassword ? (
        <div data-testid="profile-password-set-hint">
          <InfoBlock className="mb-5">{t('profile.passwordSetHint')}</InfoBlock>
        </div>
      ) : null}
      <div className={hasPassword ? 'grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6' : 'max-w-md'}>
        {hasPassword ? (
          <PasswordInputWithToggle
            id="profile-current-password"
            name="profile_password_existing"
            label={t('profile.currentPasswordLabel')}
            value={currentPassword}
            onChange={onCurrentPasswordChange}
            autoComplete="off"
            readOnlyUntilFocused
            passwordManagerIgnore
            show={showCurrentPassword}
            onToggle={() => setShowCurrentPassword((v) => !v)}
            dataTestId="profile-password-current-input"
          />
        ) : null}
        <PasswordInputWithToggle
          id="profile-new-password"
          name="new-password"
          label={t('profile.newPasswordLabel')}
          value={newPassword}
          onChange={onNewPasswordChange}
          autoComplete="new-password"
          passwordManagerIgnore
          show={showNewPassword}
          onToggle={() => setShowNewPassword((v) => !v)}
          maxLength={100}
          rules={newPasswordRules}
          dataTestId="profile-password-new-input"
        />
      </div>
    </div>
  );
}
