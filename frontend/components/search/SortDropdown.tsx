'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, startTransition, useState, useEffect } from 'react';

import { Dropdown } from '@/components/common/Dropdown';
import { useI18n } from '@/components/providers/I18nProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { sessionStorageRemoveItem, sessionStorageSetItem } from '@/lib/browser-session-storage';
import { localizedHref } from '@/lib/localized-href';
import {
  getListingSortOptions,
  LISTING_SORTS,
  isListingSortKey,
  resolveListingSortKey,
} from '@/lib/search';

function pathWithSearch(localizedBase: string, queryBody: string): string {
  if (!queryBody) return localizedBase || '/';
  const q = `?${queryBody}`;
  if (localizedBase === '/') return `/${q}`;
  const isPrefixedRootOnly = /^\/[a-z0-9-]+$/i.test(localizedBase) && localizedBase !== '/';
  if (isPrefixedRootOnly) return `${localizedBase}/${q}`;
  return `${localizedBase}${q}`;
}

interface SortDropdownProps {
  basePath?: string;
  dataTestId?: string;
  selectedSortKey?: string;
  isInternalSearchRef?: React.MutableRefObject<boolean>;
  onSortChange?: (sortBy: string, sortOrder: 'ASC' | 'DESC') => void;
}

export function SortDropdown({
  basePath = '/',
  dataTestId = 'search-sort-select',
  selectedSortKey,
  isInternalSearchRef,
  onSortChange,
}: SortDropdownProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { locale } = useI18n();
  const [mounted, setMounted] = useState(false);

  const resolvedBasePath = useMemo(() => localizedHref(basePath, locale), [basePath, locale]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentSortKey = useMemo(() => {
    if (selectedSortKey) {
      return selectedSortKey;
    }
    return resolveListingSortKey(searchParams.get('sortBy'), searchParams.get('sortOrder'));
  }, [selectedSortKey, searchParams]);

  const sortOptions = useMemo(() => {
    return getListingSortOptions(t);
  }, [t]);

  const updateSortParams = useCallback(
    (sortBy: string, sortOrder: 'ASC' | 'DESC') => {
      if (onSortChange) {
        onSortChange(sortBy, sortOrder);
        return;
      }
      const currentParams = new URLSearchParams(searchParams.toString());
      currentParams.delete('sortBy');
      currentParams.delete('sortOrder');
      currentParams.set('sortBy', sortBy);
      currentParams.set('sortOrder', sortOrder);
      const query = currentParams.toString();
      const newUrl = pathWithSearch(resolvedBasePath, query);
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      sessionStorageSetItem('scrollPreserved', 'true');
      if (isInternalSearchRef) {
        isInternalSearchRef.current = true;
      }
      startTransition(() => {
        router.replace(newUrl, { scroll: false });
        if (typeof window !== 'undefined') {
          requestAnimationFrame(() => {
            window.scrollTo({ top: scrollY, behavior: 'instant' });
            sessionStorageRemoveItem('scrollPreserved');
          });
        }
      });
    },
    [searchParams, router, resolvedBasePath, isInternalSearchRef, onSortChange],
  );

  return (
    <div className="w-full sm:min-w-[200px]">
      <Dropdown
        dataTestId={dataTestId}
        value={currentSortKey}
        onChange={(value) => {
          if (!isListingSortKey(value) || value === currentSortKey) {
            return;
          }
          const { sortBy, sortOrder } = LISTING_SORTS[value];
          updateSortParams(sortBy, sortOrder);
        }}
        fieldLabel={t('common.sortingLabel')}
        placeholder={t('common.selectSorting')}
        options={sortOptions}
        autoPosition={true}
        disabled={!mounted}
      />
    </div>
  );
}
