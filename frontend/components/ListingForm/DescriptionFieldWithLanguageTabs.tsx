'use client';

import { useEffect, useRef, useState } from 'react';

import { RichTextEditor } from '@/components/common/RichTextEditor';
import { useI18n } from '@/components/providers/I18nProvider';
import { useTabIndicator } from '@/hooks/useTabIndicator';
import { useTranslation } from '@/hooks/useTranslation';
import {
  getDescriptionLocales,
  localeToDescriptionLocale,
} from '@/lib/listingDescriptionLocale';
import { resolveLocaleRouting } from '@/lib/locale-routing';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

interface DescriptionFieldWithLanguageTabsProps {
  descriptionRo: string;
  descriptionRu: string;
  onRoChange: (_value: string) => void;
  onRuChange: (_value: string) => void;
  placeholder: string;
  editorTestId?: string;
}

function slotLabelKey(slotLocale: string): string {
  try {
    const routing = resolveLocaleRouting(loadSiteConfigSync(getCountry()));
    return (
      routing.languageSwitcherTranslationKeys[slotLocale] ??
      `common.language${slotLocale.charAt(0).toUpperCase()}${slotLocale.slice(1)}`
    );
  } catch {
    return `common.language${slotLocale.charAt(0).toUpperCase()}${slotLocale.slice(1)}`;
  }
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
  const [slot0, slot1] = getDescriptionLocales();
  const [activeLang, setActiveLang] = useState<string>(() => localeToDescriptionLocale(locale));

  useEffect(() => {
    setActiveLang(localeToDescriptionLocale(locale));
  }, [locale]);

  const slot0TabRef = useRef<HTMLButtonElement>(null);
  const slot1TabRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = { [slot0]: slot0TabRef, [slot1]: slot1TabRef } as Record<
    string,
    React.RefObject<HTMLButtonElement | null>
  >;
  const { indicatorRef, indicatorStyle } = useTabIndicator(
    activeLang,
    tabRefs,
    tabsContainerRef,
    activeLang,
  );

  const tabButtonClass = (isActive: boolean) =>
    `shrink-0 px-3 py-2 text-sm md:px-4 md:py-3 md:text-base font-semibold transition-all duration-300 relative z-10 whitespace-nowrap ${
      isActive
        ? 'text-primary-700 bg-primary-500/10 rounded-t-lg'
        : 'text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:bg-primary-500/10'
    }`;

  const isSlot0 = activeLang === slot0;

  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold mb-2 text-primary-700">
        {t('listings.descriptionLabel')}
      </label>
      <div className="mb-3 border-b border-primary-500/20">
        <div ref={tabsContainerRef} className="relative overflow-x-auto scrollbar-hide">
          <div className="relative flex gap-1 min-w-max">
            <button
              ref={slot0TabRef}
              type="button"
              data-testid="listing-form-description-tab-ro"
              onClick={() => setActiveLang(slot0)}
              className={tabButtonClass(isSlot0)}
            >
              {t(slotLabelKey(slot0))}
            </button>
            <button
              ref={slot1TabRef}
              type="button"
              data-testid="listing-form-description-tab-ru"
              onClick={() => setActiveLang(slot1)}
              className={tabButtonClass(!isSlot0)}
            >
              {t(slotLabelKey(slot1))}
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
          value={isSlot0 ? descriptionRo : descriptionRu}
          onChange={isSlot0 ? onRoChange : onRuChange}
          placeholder={placeholder}
          maxLength={5000}
          rows={14}
          editorClassName="listing-description-editor"
        />
      </div>
    </div>
  );
}
