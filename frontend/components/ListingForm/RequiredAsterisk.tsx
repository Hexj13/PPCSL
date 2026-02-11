'use client';

import { useTranslation } from '@/hooks/useTranslation';

export function RequiredAsterisk({ filled }: { filled: boolean }) {
  const { t } = useTranslation();
  return (
    <span className={filled ? 'text-green-500' : 'text-red-500'} aria-hidden>
      {' '}
      {t('common.requiredAsterisk')}
    </span>
  );
}
