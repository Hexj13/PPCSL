'use client';

import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { useI18n } from '@/components/providers/I18nProvider';
import { SmartSelectionWizard } from '@/components/smart-selection/SmartSelectionWizard';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { MAIN_VIEWPORT_MIN_HEIGHT_CLASS } from '@/lib/constants';
import { localePrefixPath } from '@/lib/url-locale';

export default function SmartSelectionPage() {
  const { isLoading, isAuthorized } = useRequireAuth({
    signReturnPath: '/smart-selection',
  });
  const { t } = useTranslation();
  const { locale } = useI18n();

  if (isLoading || !isAuthorized) {
    return <div className={`${MAIN_VIEWPORT_MIN_HEIGHT_CLASS} pb-12 md:pb-16`} aria-hidden />;
  }

  return (
    <div className={`${MAIN_VIEWPORT_MIN_HEIGHT_CLASS} pb-12 md:pb-16`}>
      <Breadcrumbs
        items={[
          { label: t('smartSelection.home'), href: localePrefixPath('/', locale) },
          { label: t('smartSelection.title') },
        ]}
        className="mb-6"
      />
      <h1 className="text-3xl md:text-4xl font-extrabold mb-3 text-primary-900">
        {t('smartSelection.title')}
      </h1>
      <p className="text-text-secondary mb-8 max-w-2xl">{t('smartSelection.intro')}</p>
      <div className="max-w-3xl">
        <SmartSelectionWizard />
      </div>
    </div>
  );
}
