'use client';

import { useTranslation } from '@/hooks/useTranslation';

import type { RegisterFormState } from './useRegisterPage';

export type MessengerFormSlice = Pick<RegisterFormState, 'viber' | 'whatsapp' | 'telegram'>;

type RegisterFormMessengersProps = {
  messengers: MessengerFormSlice;
  onMessengersChange: (next: MessengerFormSlice) => void;
  wrapperClassName?: string;
  layout?: 'wrap' | 'equalWidth';
  disabled?: boolean;
};

const messengerKey = (key: 'viber' | 'whatsapp' | 'telegram') => key;

const messengerLabelKey = {
  viber: 'register.messengerViber',
  whatsapp: 'register.messengerWhatsapp',
  telegram: 'register.messengerTelegram',
} as const;

export function RegisterFormMessengers({
  messengers,
  onMessengersChange,
  wrapperClassName,
  layout = 'wrap',
  disabled = false,
}: RegisterFormMessengersProps) {
  const { t } = useTranslation();
  const rowClass =
    layout === 'equalWidth' ? 'grid grid-cols-3 gap-2 sm:gap-3 w-full' : 'flex flex-wrap gap-3';
  const cellClass =
    layout === 'equalWidth' ? 'min-w-0 flex items-stretch' : 'flex items-center gap-2 group';
  const buttonClass =
    layout === 'equalWidth'
      ? 'w-full min-h-12 px-1.5 sm:px-3 py-3 rounded border-2 transition-all duration-200 flex items-center justify-center text-center leading-tight'
      : 'px-4 py-3 rounded border-2 transition-all duration-200 flex items-center justify-center';
  const labelClass =
    layout === 'equalWidth'
      ? 'block text-sm font-semibold mb-3 text-primary-900'
      : 'block text-sm font-semibold mb-2 text-primary-900';
  const spanClass =
    layout === 'equalWidth'
      ? 'text-xs sm:text-sm font-semibold break-words'
      : 'text-sm font-semibold';
  return (
    <div className={wrapperClassName ?? 'mb-5'}>
      <p className={labelClass}>
        {t('register.messengers')}{' '}
        <span className="text-hint text-xs font-normal">{t('register.optional')}</span>
      </p>
      <div className={rowClass}>
        {(['viber', 'whatsapp', 'telegram'] as const).map((key) => {
          const inputId = `auth-register-messenger-${key}-input`;
          return (
            <div key={messengerKey(key)} className={cellClass}>
              <div className={layout === 'equalWidth' ? 'relative w-full' : 'relative'}>
                <input
                  id={inputId}
                  type="checkbox"
                  checked={messengers[key]}
                  disabled={disabled}
                  onChange={(e) => onMessengersChange({ ...messengers, [key]: e.target.checked })}
                  className="peer sr-only"
                  data-testid={`auth-register-messenger-${key}-input`}
                />
                <label
                  htmlFor={inputId}
                  className={`${buttonClass} ${
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  } ${
                    messengers[key]
                      ? 'bg-primary-500/10 border-primary-700 text-primary-700'
                      : 'border-primary-700/50 bg-bg-secondary hover-only:hover:border-primary-700 text-primary-900'
                  }`}
                  data-testid={`auth-register-messenger-${key}-toggle`}
                >
                  <span className={spanClass}>{t(messengerLabelKey[key])}</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
