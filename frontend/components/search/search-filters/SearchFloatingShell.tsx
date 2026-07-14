'use client';

import type { ChangeEvent, MouseEvent, ReactNode, RefObject } from 'react';

import { SearchFieldFloatingLabel } from '@/components/search/search-filters/SearchFieldFloatingLabel';

type SearchFloatingShellProps = {
  fieldLabel: string;
  fieldLabelIcon?: ReactNode;
  fieldLabelTrailing?: ReactNode;
  floating: boolean;
  isOpen: boolean;
  disabled?: boolean;
  error?: boolean;
  children: ReactNode;
  onToggle?: (e: MouseEvent) => void;
  chevron?: ReactNode;
  asButton?: boolean;
  buttonClassName?: string;
  dataTestId?: string;
};

export function SearchFloatingShell({
  fieldLabel,
  fieldLabelIcon,
  fieldLabelTrailing,
  floating,
  isOpen,
  disabled = false,
  error = false,
  children,
  onToggle,
  chevron,
  asButton = false,
  buttonClassName = '',
  dataTestId,
}: SearchFloatingShellProps) {
  const shellClass = `input-field search-field-floating search-control-border relative ${
    isOpen ? 'is-open' : ''
  } ${error ? 'border-red-500' : ''} ${asButton ? `dropdown-button text-left cursor-pointer group ${buttonClassName}` : ''}`;

  if (asButton) {
    return (
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onToggle}
        disabled={disabled ? true : undefined}
        className={shellClass}
        style={{ paddingRight: '52px' }}
        suppressHydrationWarning
        data-testid={dataTestId}
        aria-label={fieldLabel}
      >
        <SearchFieldFloatingLabel
          label={fieldLabel}
          icon={fieldLabelIcon}
          trailing={fieldLabelTrailing}
          floating={floating}
        />
        {children}
        {chevron}
      </button>
    );
  }

  return (
    <div className="relative group">
      <div className={shellClass} style={{ paddingRight: '52px' }}>
        <SearchFieldFloatingLabel
          label={fieldLabel}
          icon={fieldLabelIcon}
          trailing={fieldLabelTrailing}
          floating={floating}
        />
        {children}
      </div>
      {chevron}
    </div>
  );
}

type SearchFloatingTextInputProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  floating: boolean;
  disabled?: boolean;
  fieldLabel: string;
  dataTestId?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
};

export function SearchFloatingTextInput({
  inputRef,
  value,
  floating,
  disabled = false,
  fieldLabel,
  dataTestId,
  onChange,
  onFocus,
}: SearchFloatingTextInputProps) {
  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      disabled={disabled}
      className={`search-field-floating-input ${floating ? '' : 'is-empty'}`}
      data-testid={dataTestId}
      aria-label={fieldLabel}
    />
  );
}
