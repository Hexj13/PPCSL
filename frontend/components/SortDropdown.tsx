'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, startTransition } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import {
  LISTING_SORT_OPTIONS,
  LISTING_SORTS,
  isListingSortKey,
  resolveListingSortKey,
} from '@/lib/listingSort';

import { Dropdown } from './Dropdown';

export function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const currentSortKey = useMemo(
    () => resolveListingSortKey(searchParams.get('sortBy'), searchParams.get('sortOrder')),
    [searchParams]
  );

  const updateSortParams = useCallback(
    (sortBy: string, sortOrder: 'ASC' | 'DESC') => {
      const currentParams = new URLSearchParams(searchParams.toString());
      currentParams.delete('sortBy');
      currentParams.delete('sortOrder');
      currentParams.set('sortBy', sortBy);
      currentParams.set('sortOrder', sortOrder);
      const newUrl = `/?${currentParams.toString()}`;
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('scrollPreserved', 'true');
      }
      startTransition(() => {
        router.replace(newUrl, { scroll: false });
        if (typeof window !== 'undefined') {
          requestAnimationFrame(() => {
            window.scrollTo({ top: scrollY, behavior: 'instant' });
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                sessionStorage.removeItem('scrollPreserved');
              });
            });
          });
        }
      });
    },
    [searchParams, router]
  );

  return (
    <div className="w-full sm:min-w-[200px]" suppressHydrationWarning>
      <Dropdown
        value={currentSortKey}
        onChange={(value) => {
          if (!isListingSortKey(value) || value === currentSortKey) {
            return;
          }
          const { sortBy, sortOrder } = LISTING_SORTS[value];
          updateSortParams(sortBy, sortOrder);
        }}
        placeholder={t('common.selectSorting')}
        options={LISTING_SORT_OPTIONS}
        autoPosition={true}
      />
    </div>
  );
}
