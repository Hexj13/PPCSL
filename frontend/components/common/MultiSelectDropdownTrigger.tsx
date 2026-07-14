'use client';

import type { ChangeEvent, MouseEvent, ReactNode, RefObject } from 'react';

import {
  SearchFloatingShell,
  SearchFloatingTextInput,
} from '@/components/search/search-filters/SearchFloatingShell';

type MultiSelectTriggerProps = {
  searchable: boolean;
  disabled: boolean;
  isOpen: boolean;
  floating: boolean;
  fieldLabel?: string;
  fieldLabelIcon?: ReactNode;
  displayText: string;
  placeholder?: string;
  inputValue: string;
  hasValues: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onInputFocus: () => void;
  onToggle: (e: MouseEvent) => void;
  chooseFallback: string;
};

function TriggerChevron({
  isOpen,
  onClick,
  absolute = true,
}: {
  isOpen: boolean;
  onClick?: (e: MouseEvent) => void;
  absolute?: boolean;
}) {
  return (
    <svg
      className={`${absolute ? 'absolute top-1/2 transform -translate-y-1/2' : ''} w-5 h-5 text-primary-900 group-hover:text-primary-700 transition-colors duration-200 ${
        onClick ? 'cursor-pointer' : 'shrink-0'
      } ${isOpen ? 'rotate-180' : ''}`}
      style={{ right: '16px' }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      onClick={onClick}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function MultiSelectDropdownTrigger({
  searchable,
  disabled,
  isOpen,
  floating,
  fieldLabel,
  fieldLabelIcon,
  displayText,
  placeholder,
  inputValue,
  hasValues,
  inputRef,
  onInputChange,
  onInputFocus,
  onToggle,
  chooseFallback,
}: MultiSelectTriggerProps) {
  if (fieldLabel && searchable) {
    return (
      <SearchFloatingShell
        fieldLabel={fieldLabel}
        fieldLabelIcon={fieldLabelIcon}
        floating={floating}
        isOpen={isOpen}
        disabled={disabled}
        chevron={<TriggerChevron isOpen={isOpen} onClick={onToggle} />}
      >
        <SearchFloatingTextInput
          inputRef={inputRef}
          value={inputValue}
          floating={floating}
          disabled={disabled}
          fieldLabel={fieldLabel}
          onChange={onInputChange}
          onFocus={onInputFocus}
        />
      </SearchFloatingShell>
    );
  }

  if (fieldLabel && !searchable) {
    return (
      <SearchFloatingShell
        fieldLabel={fieldLabel}
        fieldLabelIcon={fieldLabelIcon}
        floating={floating}
        isOpen={isOpen}
        disabled={disabled}
        asButton
        onToggle={onToggle}
        chevron={<TriggerChevron isOpen={isOpen} absolute />}
      >
        {hasValues ? <span className="search-field-floating-value">{displayText}</span> : null}
      </SearchFloatingShell>
    );
  }

  if (searchable) {
    return (
      <div className="relative group">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={onInputChange}
          onFocus={onInputFocus}
          disabled={disabled}
          placeholder={isOpen ? undefined : (placeholder ?? chooseFallback)}
          className="input-field"
          style={{ paddingRight: '52px' }}
        />
        <TriggerChevron isOpen={isOpen} onClick={onToggle} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onToggle}
      disabled={disabled}
      className="input-field text-left cursor-pointer relative group"
      style={{ paddingRight: '52px' }}
    >
      <span className={`flex-1 truncate ${hasValues ? 'text-text-primary' : 'text-hint'}`}>
        {displayText}
      </span>
      <TriggerChevron isOpen={isOpen} />
    </button>
  );
}
