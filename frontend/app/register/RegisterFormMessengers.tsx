'use client';

import { useTranslation } from '@/hooks/useTranslation';

import type { RegisterFormState } from './useRegisterPage';

type RegisterFormMessengersProps = {
  formData: RegisterFormState;
  setFormData: React.Dispatch<React.SetStateAction<RegisterFormState>>;
};

const messengerKey = (key: 'viber' | 'whatsapp' | 'telegram') => key;

export function RegisterFormMessengers({ formData, setFormData }: RegisterFormMessengersProps) {
  const { t } = useTranslation();
  const toggle = (key: 'viber' | 'whatsapp' | 'telegram') => {
    setFormData((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  return (
    <div className="mb-5">
      <label className="block text-sm font-semibold mb-2 text-primary-900">
        {t('register.messengers')}{' '}
        <span className="text-hint text-xs font-normal">{t('register.optional')}</span>
      </label>
      <div className="flex flex-wrap gap-3">
        {(['viber', 'whatsapp', 'telegram'] as const).map((key) => (
          <div key={messengerKey(key)} className="flex items-center gap-2 group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData[key]}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                className="sr-only"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  toggle(key);
                }}
                className={`px-4 py-3 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                  formData[key]
                    ? 'bg-primary-500/10 border-primary-700 text-primary-700'
                    : 'border-primary-700/50 bg-bg-secondary group-hover:border-primary-700 text-primary-900'
                }`}
              >
                <span className="text-sm font-semibold">
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
