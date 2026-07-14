'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { BottomSheet } from '@/components/common/BottomSheet';
import { Dropdown } from '@/components/common/Dropdown';
import { ScrollSnapSinglePicker } from '@/components/search/search-filters/mobile/sheets/ScrollSnapSinglePicker';
import { useTranslation } from '@/hooks/useTranslation';

import { RequiredAsterisk } from './RequiredAsterisk';

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

export interface ListingYearFieldProps {
  value: string;
  onChange: (_value: string) => void;
  options: Array<{ value: string; label: string }>;
  sheetTitle: string;
  placeholder?: string;
  error?: boolean;
  autoPosition?: boolean;
  menuMaxHeight?: number;
  dataTestId?: string;
  leadingIcon?: ReactNode;
  requiredAsteriskFilled?: boolean;
}

export function ListingYearField({
  value,
  onChange,
  options,
  sheetTitle,
  placeholder = '',
  error = false,
  autoPosition = false,
  menuMaxHeight,
  dataTestId,
  leadingIcon,
  requiredAsteriskFilled,
}: ListingYearFieldProps) {
  const { t } = useTranslation();
  const isMdUp = useIsMdUp();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (isMdUp) {
      setSheetOpen(false);
    }
  }, [isMdUp]);

  useEffect(() => {
    if (!sheetOpen) return;
    const fallback = options[0]?.value ?? '';
    setDraft(value || fallback);
  }, [sheetOpen, value, options]);

  const matched = value ? options.find((o) => o.value === value) : undefined;
  const displayLabel = matched?.label ?? '';

  const triggerBorder = error ? 'border-red-500' : 'search-control-border';

  const fieldLabelTrailing =
    requiredAsteriskFilled !== undefined ? (
      <RequiredAsterisk filled={requiredAsteriskFilled} />
    ) : undefined;

  if (isMdUp) {
    return (
      <Dropdown
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        searchable={false}
        error={error}
        autoPosition={autoPosition}
        menuMaxHeight={menuMaxHeight}
        dataTestId={dataTestId}
        fieldLabel={sheetTitle}
        fieldLabelIcon={leadingIcon}
        fieldLabelTrailing={fieldLabelTrailing}
      />
    );
  }

  const triggerIcon = leadingIcon;

  const confirmYear = () => {
    const next = draft || options[0]?.value || '';
    if (next) {
      onChange(next);
    }
    setSheetOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        data-testid={dataTestId}
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-lg bg-bg-base px-4 text-left transition-colors ${triggerBorder}`}
      >
        <span className="flex min-w-0 shrink items-center gap-2">
          {triggerIcon ? (
            <span className="shrink-0 text-primary-700 [&_svg]:block" aria-hidden>
              {triggerIcon}
            </span>
          ) : null}
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-sm font-semibold text-primary-900">{sheetTitle}</span>
            {requiredAsteriskFilled !== undefined ? (
              <RequiredAsterisk filled={requiredAsteriskFilled} />
            ) : null}
          </span>
        </span>
        <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {displayLabel ? (
            <span className="truncate text-sm text-text-primary">{displayLabel}</span>
          ) : null}
          <svg
            className="h-5 w-5 shrink-0 text-primary-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetTitle}
        footer={
          <button
            type="button"
            onClick={confirmYear}
            className="btn-primary w-full rounded-lg py-3"
          >
            {t('common.ok')}
          </button>
        }
      >
        <div className="px-4 pb-2">
          <ScrollSnapSinglePicker
            value={draft || options[0]?.value || ''}
            onChange={setDraft}
            options={options}
            ariaLabel={sheetTitle}
          />
        </div>
      </BottomSheet>
    </>
  );
}
