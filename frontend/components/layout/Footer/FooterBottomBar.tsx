'use client';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { useTranslation } from '@/hooks/useTranslation';

export function FooterBottomBar() {
  const { t } = useTranslation();

  return (
    <div className="border-t border-primary-500/25 bg-primary-700">
      <div className="container mx-auto flex flex-col items-center gap-3 px-3 py-4 text-center sm:px-4 md:flex-row md:items-center md:justify-between md:text-left">
        <p className="text-xs text-white/80 sm:text-sm" suppressHydrationWarning>
          <span suppressHydrationWarning>{t('footer.copyright')}</span>
        </p>
        <div className="flex shrink-0" suppressHydrationWarning>
          <LanguageSwitcher variant="desktop" context="footer" />
        </div>
      </div>
    </div>
  );
}
