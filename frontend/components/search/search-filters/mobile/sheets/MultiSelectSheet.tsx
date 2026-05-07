'use client';

import React, { useDeferredValue, useMemo, useState } from 'react';

import { MultiSelectOptionLeadingLogo } from '@/components/common/MultiSelectOptionLeadingLogo';
import { useTranslation } from '@/hooks/useTranslation';

export interface MultiSelectOption {
  value: string;
  label: string;
  category?: string;
  logoSrc?: string;
}

interface MultiSelectSheetContentProps {
  options: MultiSelectOption[];
  values: string[];
  onChange: (_values: string[]) => void;
  searchable?: boolean;
  searchInputPlaceholder?: string;
  maxSelection?: number;
  onSelectionLimitReached?: () => void;
  fillAvailableHeight?: boolean;
}

export function MultiSelectSheetContent({
  options,
  values,
  onChange,
  searchable = false,
  searchInputPlaceholder = '',
  maxSelection,
  onSelectionLimitReached,
  fillAvailableHeight = false,
}: MultiSelectSheetContentProps) {
  const { t } = useTranslation();
  const safeValues = useMemo(() => (Array.isArray(values) ? values : []), [values]);
  const valuesSet = useMemo(() => new Set(safeValues), [safeValues]);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const optionsWithLower = useMemo(
    () =>
      options.map((opt) => ({
        ...opt,
        lowerLabel: opt.label.toLowerCase(),
      })),
    [options],
  );

  const filteredOptions = useMemo(() => {
    if (!searchable || !deferredSearchQuery.trim()) return optionsWithLower;
    const q = deferredSearchQuery.toLowerCase().trim();
    return optionsWithLower.filter((option) => option.lowerLabel.includes(q));
  }, [optionsWithLower, searchable, deferredSearchQuery]);

  const handleToggle = (optionValue: string) => {
    if (!optionValue || optionValue === '' || optionValue.startsWith('__category__')) {
      return;
    }
    if (valuesSet.has(optionValue)) {
      onChange(safeValues.filter((v) => v !== optionValue));
    } else {
      const newValues = [...safeValues, optionValue];
      if (maxSelection !== undefined && newValues.length > maxSelection) {
        onSelectionLimitReached?.();
        return;
      }
      onChange(newValues);
    }
  };

  return (
    <div
      className={
        fillAvailableHeight ? 'flex flex-col min-h-0 flex-1 w-full' : 'flex flex-col min-h-0'
      }
    >
      {searchable ? (
        <div className="shrink-0 p-3 border-b border-primary-500/20">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full"
            placeholder={searchInputPlaceholder}
          />
        </div>
      ) : null}
      <div
        className={
          fillAvailableHeight
            ? 'flex-1 min-h-0 overflow-y-auto scrollbar-custom'
            : 'overflow-y-auto max-h-[min(76vh,740px)] scrollbar-custom'
        }
      >
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option, index) => {
            const isSelected = valuesSet.has(option.value);
            const isCategory =
              option.category && (!option.value || option.value.startsWith('__category__'));
            const prevOption = index > 0 ? filteredOptions[index - 1] : null;
            const showCategoryHeader =
              option.category && prevOption?.category !== option.category && !isCategory;
            const isFirstCategory = showCategoryHeader && index === 0;

            if (isCategory) {
              return (
                <div
                  key={`category-${option.category}-${index}`}
                  className={`px-4 py-2 text-primary-500 font-semibold text-sm sticky top-0 bg-bg-base z-10 border-b border-primary-500/20 pointer-events-none ${
                    isFirstCategory ? '' : ''
                  }`}
                >
                  {option.label}
                </div>
              );
            }

            return (
              <React.Fragment key={option.value || `option-${index}`}>
                {showCategoryHeader ? (
                  <div
                    className={`px-4 py-2 text-primary-500 font-semibold text-sm sticky top-0 bg-bg-base z-10 border-b border-primary-500/20 pointer-events-none ${
                      isFirstCategory ? '' : ''
                    }`}
                  >
                    {option.category}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleToggle(option.value)}
                  className={`w-full px-4 py-3.5 text-left text-text-primary hover:bg-primary-500/10 flex items-center justify-between gap-2 ${
                    isSelected ? 'bg-primary-500/15 font-semibold' : ''
                  } ${option.category ? 'pl-8' : ''}`}
                >
                  <span className="flex items-center gap-2 min-w-0 flex-1">
                    <MultiSelectOptionLeadingLogo src={option.logoSrc} />
                    <span className="truncate">{option.label}</span>
                  </span>
                  {isSelected ? (
                    <svg
                      className="w-5 h-5 shrink-0 text-primary-900"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : null}
                </button>
              </React.Fragment>
            );
          })
        ) : (
          <div className="px-4 py-6 text-text-secondary text-center text-sm">
            {t('searchFilters.noResults')}
          </div>
        )}
      </div>
    </div>
  );
}
