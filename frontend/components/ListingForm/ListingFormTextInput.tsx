'use client';

import { useEffect, useState, type ReactNode, type WheelEvent } from 'react';

import { SearchFilterInput } from '@/components/search/search-filters/SearchFilterInput';
import { useTranslation } from '@/hooks/useTranslation';

type ListingFormTextInputProps = {
  value: string;
  onChange: (_value: string) => void;
  onBlur?: (_value: string) => void;
  onWheel?: (_e: WheelEvent<HTMLInputElement>) => void;
  fieldLabel: string;
  fieldLabelIcon?: ReactNode;
  fieldLabelTrailing?: ReactNode;
  paired?: 'left' | 'middle' | 'right';
  inputMode?: 'text' | 'numeric' | 'decimal';
  title?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  mobileClassName?: string;
  inputId?: string;
  dataTestId?: string;
  placeholder?: string;
  maxLength?: number;
};

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

function TextInputClearButton({
  onClear,
  clearLabel,
  dataTestId,
}: {
  onClear: () => void;
  clearLabel: string;
  dataTestId?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClear();
      }}
      className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-primary-900 transition-colors duration-200 hover-only:hover:text-primary-700"
      aria-label={clearLabel}
      data-testid={dataTestId ? `${dataTestId}-clear` : undefined}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}

export function ListingFormTextInput({
  value,
  onChange,
  onBlur,
  onWheel,
  fieldLabel,
  fieldLabelIcon,
  fieldLabelTrailing,
  paired,
  inputMode = 'text',
  title,
  disabled = false,
  error = false,
  className = '',
  mobileClassName = '',
  inputId,
  dataTestId,
  placeholder,
  maxLength,
}: ListingFormTextInputProps) {
  const isMdUp = useIsMdUp();
  const { t } = useTranslation();
  const pairedClass =
    paired === 'left'
      ? 'paired-left'
      : paired === 'right'
        ? 'paired-right'
        : paired === 'middle'
          ? 'paired-middle'
          : '';
  const errorClass = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '';
  const showClear = value.trim() !== '' && !disabled;

  const clearButton = showClear ? (
    <TextInputClearButton
      onClear={() => onChange('')}
      clearLabel={t('common.clear')}
      dataTestId={dataTestId}
    />
  ) : null;

  if (isMdUp) {
    return (
      <div className="relative">
        <SearchFilterInput
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onWheel={onWheel}
          fieldLabel={fieldLabel}
          fieldLabelIcon={fieldLabelIcon}
          fieldLabelTrailing={fieldLabelTrailing}
          paired={paired}
          inputMode={inputMode}
          title={title}
          disabled={disabled}
          className={`${errorClass} ${showClear ? 'pr-12' : ''} ${className}`.trim()}
          data-testid={dataTestId}
          placeholder={placeholder}
          maxLength={maxLength}
        />
        {clearButton}
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        id={inputId}
        type="text"
        inputMode={inputMode}
        value={value}
        disabled={disabled}
        title={title}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        onWheel={onWheel}
        className={`input-field search-control-border h-[48px] ${pairedClass} ${errorClass} ${showClear ? 'pr-12' : ''} ${mobileClassName}`.trim()}
        data-testid={dataTestId}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-label={fieldLabel}
      />
      {clearButton}
    </div>
  );
}
