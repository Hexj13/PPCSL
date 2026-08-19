'use client';

import type { ReactNode } from 'react';

import { MultiSelectOptionLeadingLogo } from '@/components/common/MultiSelectOptionLeadingLogo';
import { SKELETON_DEFERRED, useLoadingState } from '@/hooks/useLoadingState';
import { useTranslation } from '@/hooks/useTranslation';
import type { CatalogSuggestItem } from '@/lib/search/header-catalog-suggest.types';
import { Spinner } from '@/ui';

function itemId(index: number): string {
  return `header-catalog-search-option-${index}`;
}

function vehicleTypeLabelKey(vehicleType: CatalogSuggestItem['vehicleType']): string {
  if (vehicleType === 'truck') {
    return 'searchFilters.vehicleTypeTruck';
  }
  if (vehicleType === 'moto') {
    return 'searchFilters.vehicleTypeMoto';
  }
  return 'searchFilters.vehicleTypeCar';
}

export function HeaderCatalogSuggestList({
  items,
  isLoading,
  activeIndex,
  listId,
  onHover,
  onSelect,
}: {
  items: CatalogSuggestItem[];
  isLoading: boolean;
  activeIndex: number;
  listId: string;
  onHover: (index: number) => void;
  onSelect: (item: CatalogSuggestItem) => void;
}) {
  const { t } = useTranslation();
  const { visible: showLoader } = useLoadingState({
    isLoading,
    ...SKELETON_DEFERRED,
  });

  const categorySubtitle = (item: CatalogSuggestItem): ReactNode => {
    if (item.kind === 'year' || !item.vehicleType) {
      return null;
    }
    const typeLabel = t(vehicleTypeLabelKey(item.vehicleType));
    if (item.kind === 'model' || item.kind === 'model_year') {
      const brand = item.brandName ?? '';
      if (!brand) {
        return typeLabel;
      }
      return (
        <>
          {brand}
          {' · '}
          {typeLabel}
        </>
      );
    }
    return typeLabel;
  };

  if (isLoading || showLoader) {
    if (!showLoader) {
      return <div className="min-h-[12rem]" aria-busy="true" />;
    }
    return (
      <div
        className="flex min-h-[12rem] flex-col items-center justify-center gap-3 px-4 py-8"
        data-testid="header-catalog-search-loading"
      >
        <Spinner inline size="md" className="opacity-80" />
        <p className="text-center max-w-xs text-sm text-primary-700">
          {t('header.catalogSearchLoading')}
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-primary-700" data-testid="header-catalog-search-empty">
        {t('header.catalogSearchEmpty')}
      </p>
    );
  }

  return (
    <ul id={listId} role="listbox" className="max-h-[min(24rem,70vh)] overflow-y-auto">
      {items.map((item, index) => {
        const active = index === activeIndex;
        const category = categorySubtitle(item);
        return (
          <li
            key={`${item.kind}-${item.brandSlug}-${item.modelSlug}-${item.vehicleType}-${item.year}-${index}`}
            role="presentation"
          >
            <button
              type="button"
              id={itemId(index)}
              role="option"
              aria-selected={active}
              data-testid="header-catalog-search-item"
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                active ? 'bg-primary-500/10' : ''
              }`}
              onMouseEnter={() => onHover(index)}
              onClick={() => onSelect(item)}
            >
              <MultiSelectOptionLeadingLogo src={item.logoUrl ?? undefined} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-primary-900">
                  {item.title}
                </span>
                {category || item.year !== null ? (
                  <span className="block truncate text-xs text-primary-700">
                    {category}
                    {category && item.year !== null ? ' · ' : null}
                    {item.year !== null
                      ? t('header.catalogSearchYearWithValue', { year: item.year })
                      : null}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
