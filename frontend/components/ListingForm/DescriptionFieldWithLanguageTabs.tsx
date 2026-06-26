'use client';

import { useEffect, useRef, useState } from 'react';

import { RichTextEditor } from '@/components/common/RichTextEditor';
import { useI18n } from '@/components/providers/I18nProvider';
import { useTabIndicator } from '@/hooks/useTabIndicator';
import { useTranslation } from '@/hooks/useTranslation';

export type ListingDescriptionLang = 'ro' | 'ru';

interface DescriptionFieldWithLanguageTabsProps {
  descriptionRo: string;
  descriptionRu: string;
  onRoChange: (_value: string) => void;
  onRuChange: (_value: string) => void;
  placeholder: string;
  editorTestId?: string;
}

export function DescriptionFieldWithLanguageTabs({
  descriptionRo,
  descriptionRu,
  onRoChange,
  onRuChange,
  placeholder,
  editorTestId = 'listing-form-description-editor',
}: DescriptionFieldWithLanguageTabsProps) {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const [activeLang, setActiveLang] = useState<ListingDescriptionLang>(() =>
    locale === 'ru' ? 'ru' : 'ro',
  );

  useEffect(() => {
    setActiveLang(locale === 'ru' ? 'ru' : 'ro');
  }, [locale]);

  const roTabRef = useRef<HTMLButtonElement>(null);
  const ruTabRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const { indicatorRef, indicatorStyle } = useTabIndicator(
    activeLang,
    { ro: roTabRef, ru: ruTabRef },
    tabsContainerRef,
    activeLang,
  );

  const tabButtonClass = (isActive: boolean) =>
    `shrink-0 px-3 py-2 text-sm md:px-4 md:py-3 md:text-base font-semibold transition-all duration-300 relative z-10 whitespace-nowrap ${
      isActive
        ? 'text-primary-700 bg-primary-500/10 rounded-t-lg'
        : 'text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:bg-primary-500/10'
    }`;

  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold mb-2 text-primary-700">
        {t('listings.descriptionLabel')}
      </label>
      <div className="mb-3 border-b border-primary-500/20">
        <div ref={tabsContainerRef} className="relative overflow-x-auto scrollbar-hide">
          <div className="relative flex gap-1 min-w-max">
            <button
              ref={roTabRef}
              type="button"
              data-testid="listing-form-description-tab-ro"
              onClick={() => setActiveLang('ro')}
              className={tabButtonClass(activeLang === 'ro')}
            >
              {t('common.languageRo')}
            </button>
            <button
              ref={ruTabRef}
              type="button"
              data-testid="listing-form-description-tab-ru"
              onClick={() => setActiveLang('ru')}
              className={tabButtonClass(activeLang === 'ru')}
            >
              {t('common.languageRu')}
            </button>
            <div
              ref={indicatorRef}
              className="absolute bottom-0 h-0.5 bg-primary-700 transition-all duration-300 ease-in-out"
              style={{
                left: `${indicatorStyle.left}px`,
                width: `${indicatorStyle.width}px`,
              }}
            />
          </div>
        </div>
      </div>
      <div data-testid={editorTestId}>
        <RichTextEditor
          key={activeLang}
          value={activeLang === 'ro' ? descriptionRo : descriptionRu}
          onChange={activeLang === 'ro' ? onRoChange : onRuChange}
          placeholder={placeholder}
          maxLength={5000}
          rows={14}
          editorClassName="listing-description-editor"
        />
      </div>
    </div>
  );
}
