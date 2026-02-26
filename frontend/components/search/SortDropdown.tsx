'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, startTransition, useState, useEffect } from 'react';

import { Dropdown } from '@/components/common/Dropdown';
import { useTranslation } from '@/hooks/useTranslation';
import {
  getListingSortOptions,
  LISTING_SORTS,
  isListingSortKey,
  resolveListingSortKey,
} from '@/lib/search';

interface SortDropdownProps {
  basePath?: string;
  isInternalSearchRef?: React.MutableRefObject<boolean>;
  onSortChange?: (sortBy: string, sortOrder: 'ASC' | 'DESC') => void;
}

export function SortDropdown({
  basePath = '/',
  isInternalSearchRef,
  onSortChange,
}: SortDropdownProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentSortKey = useMemo(
    () => resolveListingSortKey(searchParams.get('sortBy'), searchParams.get('sortOrder')),
    [searchParams],
  );

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
      const newUrl = basePath === '/' ? `/?${query}` : `${basePath}${query ? `?${query}` : ''}`;
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('scrollPreserved', 'true');
      }
      if (isInternalSearchRef) {
        isInternalSearchRef.current = true;
      }
      startTransition(() => {
        router.replace(newUrl, { scroll: false });
        if (typeof window !== 'undefined') {
          requestAnimationFrame(() => {
            window.scrollTo({ top: scrollY, behavior: 'instant' });
            sessionStorage.removeItem('scrollPreserved');
          });
        }
      });
    },
    [searchParams, router, basePath, isInternalSearchRef, onSortChange],
  );

  return (
    <div className="w-full sm:min-w-[200px]">
      <Dropdown
        value={currentSortKey}
        buttonClassName="!h-[52px] !min-h-[52px] !max-h-[52px]"
        onChange={(value) => {
          if (!isListingSortKey(value) || value === currentSortKey) {
            return;
          }
          const { sortBy, sortOrder } = LISTING_SORTS[value];
          updateSortParams(sortBy, sortOrder);
        }}
        placeholder={t('common.selectSorting')}
        options={sortOptions}
        autoPosition={true}
        disabled={!mounted}
      />
    </div>
  );
}
