'use client';

import { useEffect, useState, type ReactNode, type WheelEvent } from 'react';

import { SearchFilterInput } from '@/components/search/search-filters/SearchFilterInput';

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
  const pairedClass =
    paired === 'left'
      ? 'paired-left'
      : paired === 'right'
        ? 'paired-right'
        : paired === 'middle'
          ? 'paired-middle'
          : '';
  const errorClass = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '';

  if (isMdUp) {
    return (
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
        className={`${errorClass} ${className}`.trim()}
        data-testid={dataTestId}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    );
  }

  return (
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
      className={`input-field search-control-border h-[48px] ${pairedClass} ${errorClass} ${mobileClassName}`.trim()}
      data-testid={dataTestId}
      placeholder={placeholder}
      maxLength={maxLength}
      aria-label={fieldLabel}
    />
  );
}
