'use client';

import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { BottomSheet } from '@/components/common/BottomSheet';
import { Dropdown } from '@/components/common/Dropdown';
import { MultiSelectOptionLeadingLogo } from '@/components/common/MultiSelectOptionLeadingLogo';
import type { DropdownOption } from '@/components/common/dropdown-types';
import { useTranslation } from '@/hooks/useTranslation';
import { BOTTOM_SHEET_LIST_SCROLL_CLASS } from '@/lib/bottom-sheet-layout';

import { RequiredAsterisk } from './RequiredAsterisk';

const RENDER_CHUNK = 50;

function useIsMdUp(): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = () => setMatches(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return matches;
}

export interface MobileSelectFieldProps {
  value: string;
  onChange: (_value: string) => void;
  options: DropdownOption[];
  sheetTitle: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  searchable?: boolean;
  error?: boolean;
  autoPosition?: boolean;
  menuMaxHeight?: number;
  dataTestId?: string;
  leadingIcon?: React.ReactNode;
  requiredAsteriskFilled?: boolean;
  rightIcon?: React.ReactNode;
  mobileValueOnlyTrigger?: boolean;
}

export function MobileSelectField({
  value,
  onChange,
  options,
  sheetTitle,
  disabled = false,
  placeholder = '',
  className = '',
  buttonClassName = '',
  searchable = false,
  error = false,
  autoPosition = false,
  menuMaxHeight,
  dataTestId,
  leadingIcon,
  requiredAsteriskFilled,
  rightIcon,
  mobileValueOnlyTrigger = false,
}: MobileSelectFieldProps) {
  const isMdUp = useIsMdUp();
  const { t } = useTranslation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftValue, setDraftValue] = useState(value ?? '');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value],
  );

  const displaySummary = useMemo(() => {
    if (selectedOption) return selectedOption.label;
    return '';
  }, [selectedOption]);

  const optionsWithLower = useMemo(
    () => options.map((opt) => ({ ...opt, lowerLabel: opt.label.toLowerCase() })),
    [options],
  );

  const filteredOptions = useMemo(() => {
    if (!searchable || !deferredSearchQuery.trim()) return optionsWithLower;
    const q = deferredSearchQuery.toLowerCase().trim();
    return optionsWithLower.filter((opt) => opt.lowerLabel.includes(q));
  }, [optionsWithLower, searchable, deferredSearchQuery]);

  const [visibleCount, setVisibleCount] = useState(RENDER_CHUNK);
  const optionsToRender =
    filteredOptions.length <= RENDER_CHUNK
      ? filteredOptions
      : filteredOptions.slice(0, visibleCount);

  useEffect(() => {
    if (!isSheetOpen) {
      setVisibleCount(RENDER_CHUNK);
      return;
    }
    if (filteredOptions.length <= RENDER_CHUNK) return;
    const id = requestAnimationFrame(() => setVisibleCount(filteredOptions.length));
    return () => cancelAnimationFrame(id);
  }, [isSheetOpen, filteredOptions.length]);

  useEffect(() => {
    if (!isSheetOpen) {
      setSearchQuery('');
      setDraftValue(value ?? '');
    }
  }, [isSheetOpen, value]);

  useEffect(() => {
    if (isMdUp) {
      setIsSheetOpen(false);
    }
  }, [isMdUp]);

  const openSheet = () => {
    if (disabled) return;
    setDraftValue(value ?? '');
    setIsSheetOpen(true);
  };

  const handleSelectOption = (optionValue: string) => {
    if (optionValue.startsWith('__category__')) return;
    setDraftValue((current) => (current === optionValue ? '' : optionValue));
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    setSearchQuery('');
  };

  const confirmSelection = () => {
    if (draftValue !== (value ?? '')) {
      onChange(draftValue);
    }
    closeSheet();
  };

  const renderOptionList = () =>
    optionsToRender.length > 0 ? (
      optionsToRender.map((option, index) => {
        const normalizedValue = draftValue ?? '';
        const selected =
          option.value === '' ? normalizedValue === '' : option.value === normalizedValue;
        const isCategory =
          Boolean(option.category) && (!option.value || option.value.startsWith('__category__'));
        const optionDisabled = Boolean(normalizedValue) && !selected;
        const prevOption = index > 0 ? optionsToRender[index - 1] : null;
        const showCategoryHeader =
          Boolean(option.category) && prevOption?.category !== option.category && !isCategory;

        if (isCategory) {
          return (
            <div
              key={`category-${option.category}-${index}`}
              className="pointer-events-none sticky top-0 z-10 border-b border-primary-500/20 bg-bg-base px-4 py-2 text-sm font-semibold text-primary-500"
            >
              {option.label}
            </div>
          );
        }

        return (
          <React.Fragment key={option.value || `option-${index}`}>
            {showCategoryHeader ? (
              <div className="pointer-events-none sticky top-0 z-10 border-b border-primary-500/20 bg-bg-base px-4 py-2 text-sm font-semibold text-primary-500">
                {option.category}
              </div>
            ) : null}
            <button
              type="button"
              disabled={optionDisabled}
              onClick={() => handleSelectOption(option.value)}
              data-testid={dataTestId ? `${dataTestId}-option-${index}` : undefined}
              className={`flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                optionDisabled ? '' : 'hover:bg-primary-500/10'
              } ${
                selected ? 'bg-primary-500/15 font-semibold' : ''
              } ${option.category ? 'pl-8' : ''}`}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <MultiSelectOptionLeadingLogo src={option.logoSrc} />
                <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                  {option.label}
                </span>
              </span>
              {selected ? (
                <svg
                  className="h-5 w-5 shrink-0 text-primary-900"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden
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
      <div className="px-4 py-6 text-center text-sm text-text-secondary">
        {t('searchFilters.noResults')}
      </div>
    );

  const triggerIcon = leadingIcon ?? rightIcon;
  const mobileTriggerPrimaryText =
    displaySummary.trim() !== ''
      ? displaySummary
      : placeholder.trim() !== ''
        ? placeholder
        : sheetTitle;
  const mobileTriggerAriaLabel = mobileValueOnlyTrigger
    ? `${sheetTitle}: ${mobileTriggerPrimaryText}`
    : undefined;
  const triggerBorder = error ? 'border-red-500' : 'search-control-border';

  const fieldLabelTrailing =
    requiredAsteriskFilled !== undefined ? (
      <RequiredAsterisk filled={requiredAsteriskFilled} />
    ) : undefined;

  if (isMdUp) {
    return (
      <div className={className}>
        <Dropdown
          value={value}
          onChange={onChange}
          options={options}
          disabled={disabled}
          placeholder={placeholder}
          buttonClassName={buttonClassName}
          searchable={searchable}
          error={error}
          autoPosition={autoPosition}
          menuMaxHeight={menuMaxHeight}
          dataTestId={dataTestId}
          rightIcon={rightIcon}
          fieldLabel={sheetTitle}
          fieldLabelIcon={leadingIcon}
          fieldLabelTrailing={fieldLabelTrailing}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={openSheet}
        data-testid={dataTestId}
        aria-label={mobileTriggerAriaLabel}
        aria-haspopup="dialog"
        aria-expanded={isSheetOpen}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-lg bg-bg-base px-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${triggerBorder} ${buttonClassName}`}
      >
        {mobileValueOnlyTrigger ? (
          <>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {triggerIcon ? (
                <span className="shrink-0 text-primary-700 [&_svg]:block" aria-hidden>
                  {triggerIcon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-primary-900">
                {mobileTriggerPrimaryText}
              </span>
            </span>
            <svg
              className="h-5 w-5 shrink-0 text-primary-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        ) : (
          <>
            <span className="flex min-w-0 shrink items-center gap-2">
              {triggerIcon ? (
                <span className="shrink-0 text-primary-700 [&_svg]:block" aria-hidden>
                  {triggerIcon}
                </span>
              ) : null}
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="truncate text-sm font-semibold text-primary-900">
                  {sheetTitle}
                </span>
                {requiredAsteriskFilled !== undefined ? (
                  <RequiredAsterisk filled={requiredAsteriskFilled} />
                ) : null}
              </span>
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
              {displaySummary.trim() !== '' ? (
                <span className="truncate text-sm text-text-primary">{displaySummary}</span>
              ) : null}
              <svg
                className="h-5 w-5 shrink-0 text-primary-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </span>
          </>
        )}
      </button>

      <BottomSheet
        isOpen={isSheetOpen}
        onClose={closeSheet}
        title={sheetTitle}
        lockSheetHeight={searchable}
        footer={
          <button
            type="button"
            onClick={confirmSelection}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        {searchable ? (
          <div className="flex min-h-0 w-full flex-1 flex-col">
            <div className="shrink-0 border-b border-primary-500/20 p-3">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field search-control-border w-full"
                placeholder={t('common.search')}
              />
            </div>
            <div data-bottom-sheet-scrollable="true" className={BOTTOM_SHEET_LIST_SCROLL_CLASS}>
              {renderOptionList()}
            </div>
          </div>
        ) : (
          <div
            data-bottom-sheet-scrollable="true"
            className={`${BOTTOM_SHEET_LIST_SCROLL_CLASS} max-h-full`}
          >
            {renderOptionList()}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
