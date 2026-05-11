'use client';

import { useTranslation } from '@/hooks/useTranslation';

import type { RegisterFormState } from './useRegisterPage';

export type MessengerFormSlice = Pick<RegisterFormState, 'viber' | 'whatsapp' | 'telegram'>;

type RegisterFormMessengersProps = {
  messengers: MessengerFormSlice;
  onMessengersChange: (next: MessengerFormSlice) => void;
  wrapperClassName?: string;
  layout?: 'wrap' | 'equalWidth';
};

const messengerKey = (key: 'viber' | 'whatsapp' | 'telegram') => key;

export function RegisterFormMessengers({
  messengers,
  onMessengersChange,
  wrapperClassName,
  layout = 'wrap',
}: RegisterFormMessengersProps) {
  const { t } = useTranslation();
  const toggle = (key: 'viber' | 'whatsapp' | 'telegram') => {
    onMessengersChange({ ...messengers, [key]: !messengers[key] });
  };
  const rowClass =
    layout === 'equalWidth' ? 'grid grid-cols-3 gap-2 sm:gap-3 w-full' : 'flex flex-wrap gap-3';
  const cellClass =
    layout === 'equalWidth' ? 'min-w-0 flex items-stretch' : 'flex items-center gap-2 group';
  const buttonClass =
    layout === 'equalWidth'
      ? 'w-full min-h-12 px-1.5 sm:px-3 py-3 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer text-center leading-tight'
      : 'px-4 py-3 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer';
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
      <label className={labelClass}>
        {t('register.messengers')}{' '}
        <span className="text-hint text-xs font-normal">{t('register.optional')}</span>
      </label>
      <div className={rowClass}>
        {(['viber', 'whatsapp', 'telegram'] as const).map((key) => (
          <div key={messengerKey(key)} className={cellClass}>
            <div className={layout === 'equalWidth' ? 'relative w-full' : 'relative'}>
              <input
                type="checkbox"
                checked={messengers[key]}
                onChange={(e) => onMessengersChange({ ...messengers, [key]: e.target.checked })}
                className="sr-only"
                data-testid={`auth-register-messenger-${key}-input`}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  toggle(key);
                }}
                className={`${buttonClass} ${
                  messengers[key]
                    ? 'bg-primary-500/10 border-primary-700 text-primary-700'
                    : 'border-primary-700/50 bg-bg-secondary hover-only:hover:border-primary-700 text-primary-900'
                }`}
                data-testid={`auth-register-messenger-${key}-toggle`}
              >
                <span className={spanClass}>
                  {key === 'viber' ? 'Viber' : key === 'whatsapp' ? 'WhatsApp' : 'Telegram'}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
