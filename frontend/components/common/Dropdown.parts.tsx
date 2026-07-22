'use client';

import React from 'react';

import { MultiSelectOptionLeadingLogo } from '@/components/common/MultiSelectOptionLeadingLogo';
import {
  SearchFloatingShell,
  SearchFloatingTextInput,
} from '@/components/search/search-filters/SearchFloatingShell';
import { Button, designTokens } from '@/ui';

import type { DropdownOption } from './dropdown-types';

interface DropdownTriggerProps {
  searchable: boolean;
  disabled: boolean;
  isOpen: boolean;
  searchQuery: string;
  selectedOption: DropdownOption | null;
  displayText: string;
  placeholder: string;
  error: boolean;
  buttonClassName: string;
  rightIcon?: React.ReactNode;
  fieldLabel?: string;
  fieldLabelIcon?: React.ReactNode;
  fieldLabelTrailing?: React.ReactNode;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputFocus: () => void;
  onToggle: (e: React.MouseEvent) => void;
  dataTestId?: string;
}

export function DropdownTrigger({
  searchable,
  disabled,
  isOpen,
  searchQuery,
  selectedOption,
  displayText,
  placeholder,
  error,
  buttonClassName,
  rightIcon,
  fieldLabel,
  fieldLabelIcon,
  fieldLabelTrailing,
  inputRef,
  onInputChange,
  onInputFocus,
  onToggle,
  dataTestId,
}: DropdownTriggerProps) {
  const floating = Boolean(fieldLabel) && (Boolean(selectedOption) || searchQuery.length > 0);

  if (fieldLabel && searchable) {
    return (
      <SearchFloatingShell
        fieldLabel={fieldLabel}
        fieldLabelIcon={fieldLabelIcon}
        fieldLabelTrailing={fieldLabelTrailing}
        floating={floating}
        isOpen={isOpen}
        disabled={disabled}
        error={error}
        chevron={<DropdownChevron isOpen={isOpen} onClick={onToggle} />}
      >
        <SearchFloatingTextInput
          inputRef={inputRef}
          value={isOpen ? searchQuery : selectedOption ? displayText : ''}
          floating={floating}
          disabled={disabled}
          fieldLabel={fieldLabel}
          dataTestId={dataTestId}
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
        fieldLabelTrailing={fieldLabelTrailing}
        floating={floating}
        isOpen={isOpen}
        disabled={disabled}
        error={error}
        asButton
        buttonClassName={buttonClassName}
        onToggle={onToggle}
        dataTestId={dataTestId}
        chevron={
          <DropdownChevron
            isOpen={isOpen}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-900 group-hover:text-primary-700 transition-colors duration-200 shrink-0 pointer-events-none"
            style={{ right: '16px' }}
          />
        }
      >
        {selectedOption ? (
          <span className="search-field-floating-value" suppressHydrationWarning>
            {displayText}
          </span>
        ) : null}
      </SearchFloatingShell>
    );
  }

  if (searchable) {
    return (
      <div className="relative group">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : selectedOption ? displayText : ''}
          onChange={onInputChange}
          onFocus={onInputFocus}
          disabled={disabled}
          placeholder={isOpen ? undefined : placeholder}
          className={`input-field ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${selectedOption ? 'text-text-primary' : ''}`}
          style={{ paddingRight: '52px', color: selectedOption ? undefined : '#9ca3af' }}
          data-testid={dataTestId}
        />
        <DropdownChevron isOpen={isOpen} onClick={onToggle} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onToggle}
      disabled={disabled ? true : undefined}
      className={`input-field dropdown-button text-left cursor-pointer relative flex items-center group ${rightIcon ? 'gap-1 md:gap-1.5' : ''} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${buttonClassName || ''}`}
      style={{ paddingRight: '52px' }}
      suppressHydrationWarning
      data-testid={dataTestId}
    >
      {rightIcon && (
        <span className="shrink-0" suppressHydrationWarning>
          {rightIcon}
        </span>
      )}
      <span
        className="flex-1 truncate min-w-0 text-text-primary"
        style={!selectedOption ? { color: '#9ca3af' } : undefined}
        suppressHydrationWarning
      >
        {displayText}
      </span>
      <DropdownChevron
        isOpen={isOpen}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-900 group-hover:text-primary-700 transition-colors duration-200 shrink-0 pointer-events-none"
        style={{ right: '16px' }}
      />
    </button>
  );
}

interface DropdownMenuProps {
  menuRef: React.RefObject<HTMLDivElement | null>;
  openUpwards: boolean;
  isPositioned: boolean;
  filteredOptions: DropdownOption[];
  value: string;
  tempValue: string;
  showActionButtons: boolean;
  onSelect: (_value: string) => void;
  onReset: () => void;
  onConfirm: () => void;
  t: (_key: string) => string;
  portalStyle?: React.CSSProperties;
  menuMaxHeight?: number;
  menuSelectedStyle: 'background' | 'checkmark';
  menuExpandToContent: boolean;
  dataTestId?: string;
}

export function DropdownMenu({
  menuRef,
  openUpwards,
  isPositioned,
  filteredOptions,
  value,
  tempValue,
  showActionButtons,
  onSelect,
  onReset,
  onConfirm,
  t,
  portalStyle,
  menuMaxHeight,
  menuSelectedStyle,
  menuExpandToContent,
  dataTestId,
}: DropdownMenuProps) {
  const isPortaled = !!portalStyle;
  const scrollStyle = menuMaxHeight != null ? { maxHeight: menuMaxHeight } : undefined;
  const scrollClass =
    menuMaxHeight != null
      ? 'overflow-auto scrollbar-custom'
      : 'max-h-96 overflow-auto scrollbar-custom';
  const widthClass =
    isPortaled || !menuExpandToContent ? (isPortaled ? '' : 'w-full') : 'min-w-full w-max';
  return (
    <div
      ref={menuRef}
      className={`bg-white border-2 border-primary-500/30 rounded-lg shadow-xl ${
        isPortaled
          ? ''
          : `absolute ${widthClass} ${openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'}`
      } ${!isPositioned ? 'opacity-0 pointer-events-none' : ''}`}
      style={isPortaled ? portalStyle : { zIndex: designTokens.zIndex.dropdown }}
      data-testid={dataTestId ? `${dataTestId}-menu` : undefined}
    >
      <div className={scrollClass} style={scrollStyle}>
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option, index) => {
            const isSelected = showActionButtons
              ? option.value === tempValue
              : option.value === value;
            const selectedHighlight =
              menuSelectedStyle === 'background' && isSelected
                ? 'bg-primary-500/20 font-semibold'
                : '';
            const isCategory =
              Boolean(option.category) &&
              (!option.value || option.value.startsWith('__category__'));
            const prevOption = index > 0 ? filteredOptions[index - 1] : null;
            const showCategoryHeader =
              Boolean(option.category) && prevOption?.category !== option.category && !isCategory;
            const isFirstCategory = showCategoryHeader && index === 0;

            if (isCategory) {
              return (
                <div
                  key={`category-${option.category}-${index}`}
                  className={`px-4 py-2 text-primary-500 font-semibold text-sm sticky top-0 bg-white z-10 border-b border-primary-500/20 pointer-events-none ${
                    isFirstCategory ? 'rounded-t-lg' : ''
                  }`}
                >
                  {option.label}
                </div>
              );
            }

            return (
              <React.Fragment key={option.value || `option-${index}`}>
                {showCategoryHeader && (
                  <div
                    className={`px-4 py-2 text-primary-500 font-semibold text-sm sticky top-0 bg-white z-10 border-b border-primary-500/20 pointer-events-none ${
                      isFirstCategory ? 'rounded-t-lg' : ''
                    }`}
                  >
                    {option.category}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onSelect(option.value)}
                  className={`w-full px-4 py-3 text-left text-sm text-text-primary hover-only:hover:bg-primary-500/10 transition-colors duration-150 flex items-center justify-between gap-2 ${selectedHighlight} ${option.category ? 'pl-8' : ''}`}
                  data-testid={dataTestId ? `${dataTestId}-option-${index}` : undefined}
                >
                  <span
                    className={`flex min-w-0 items-center gap-2 ${menuExpandToContent ? 'flex-1 whitespace-nowrap pr-1' : 'flex-1'}`}
                  >
                    {option.leadingEmoji ? (
                      <span className="shrink-0 text-base leading-none" aria-hidden>
                        {option.leadingEmoji}
                      </span>
                    ) : null}
                    <MultiSelectOptionLeadingLogo src={option.logoSrc} />
                    <span
                      className={
                        menuExpandToContent ? 'whitespace-nowrap pr-1' : 'min-w-0 truncate'
                      }
                    >
                      {option.label}
                    </span>
                  </span>
                  {menuSelectedStyle === 'checkmark' && isSelected ? (
                    <svg
                      className="w-4 h-4 shrink-0 text-semantic-success"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : null}
                </button>
              </React.Fragment>
            );
          })
        ) : (
          <div className="px-4 py-3 text-text-secondary text-center">
            {t('searchFilters.noResults')}
          </div>
        )}
      </div>
      {showActionButtons && (
        <div className="border-t border-divider px-2 py-1.5 flex justify-end gap-1.5 bg-white">
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-1.5 text-sm text-text-primary hover-only:hover:text-primary-500 transition-colors duration-150"
          >
            {t('common.reset')}
          </button>
          <Button variant="primary" size="xs" onClick={onConfirm}>
            {t('common.ok')}
          </Button>
        </div>
      )}
    </div>
  );
}

function DropdownChevron({
  isOpen,
  onClick,
  className = '',
  style,
}: {
  isOpen: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const baseClass = 'w-5 h-5 text-primary-900 transition-colors duration-200';
  const positioned = onClick ? 'cursor-pointer group-hover:text-primary-700' : '';
  const rotate = isOpen ? 'rotate-180' : '';
  return (
    <svg
      className={`absolute top-1/2 transform -translate-y-1/2 ${baseClass} ${positioned} ${rotate} ${className}`}
      style={onClick ? { right: '16px' } : style}
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
