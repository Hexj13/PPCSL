'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { MAIN_VIEWPORT_MIN_HEIGHT_CLASS } from '@/lib/constants';
import { Spinner } from '@/ui';

export function CompleteProfilePageLoader() {
  const { t } = useTranslation();

  return (
    <div
      className={`max-w-md mx-auto mt-6 md:mt-12 mb-16 ${MAIN_VIEWPORT_MIN_HEIGHT_CLASS} flex flex-col items-center justify-center`}
      data-testid="complete-profile-loading"
    >
      <Spinner size="lg" className="text-primary-700" />
      <p className="mt-4 text-primary-700 font-semibold">{t('common.loading')}</p>
    </div>
  );
}
