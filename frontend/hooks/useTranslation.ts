'use client';

import { useCallback } from 'react';

import { useI18n } from '@/components/I18nProvider';
import type { Translations } from '@/lib/i18n';

export function useTranslation() {
  const { translations, isLoading } = useI18n();

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      if (!translations) {
        return key;
      }

      const keys = key.split('.');
      let value: unknown = translations;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          return key;
        }
      }

      if (typeof value !== 'string') {
        return key;
      }

      if (params) {
        return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
          return params[paramKey]?.toString() || match;
        });
      }

      return value;
    },
    [translations]
  );

  return { t, isLoading, translations: translations as Translations };
}
