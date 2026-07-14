'use client';

import { useId, useState, type ReactNode, type WheelEvent } from 'react';

import { SearchFieldFloatingLabel } from './SearchFieldFloatingLabel';

type SearchFilterInputProps = {
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
  className?: string;
  'data-testid'?: string;
  placeholder?: string;
  maxLength?: number;
};

export function SearchFilterInput({
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
  className = '',
  'data-testid': dataTestId,
  placeholder,
  maxLength,
}: SearchFilterInputProps) {
  const inputId = useId();
  const [focused, setFocused] = useState(false);
  const hasValue = value.trim().length > 0;
  const floating = focused || hasValue;
  const pairedClass =
    paired === 'left'
      ? 'paired-left'
      : paired === 'right'
        ? 'paired-right'
        : paired === 'middle'
          ? 'paired-middle'
          : '';

  return (
    <div
      className={`input-field search-field-floating search-control-border relative ${pairedClass} ${
        focused ? 'is-open' : ''
      } ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      <SearchFieldFloatingLabel
        label={fieldLabel}
        icon={fieldLabelIcon}
        trailing={fieldLabelTrailing}
        floating={floating}
        htmlFor={inputId}
      />
      <input
        id={inputId}
        type="text"
        inputMode={inputMode}
        value={value}
        disabled={disabled}
        title={title}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e.target.value);
        }}
        onWheel={onWheel}
        className={`search-field-floating-input ${floating ? '' : 'is-empty'}`}
        aria-label={fieldLabel}
        data-testid={dataTestId}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  );
}
