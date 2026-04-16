'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { designTokens } from '@/ui';

interface MultiSelectOption {
  value: string;
  label: string;
  category?: string;
}

interface MultiSelectDropdownProps {
  values: string[];
  onChange: (_values: string[]) => void;
  options: MultiSelectOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  searchable?: boolean;
  showActionButtons?: boolean;
  maxSelection?: number;
  onSelectionLimitReached?: () => void;
}

function MultiSelectDropdownComponent({
  values,
  onChange,
  options,
  disabled = false,
  placeholder,
  className = '',
  searchable = false,
  showActionButtons = false,
  maxSelection,
  onSelectionLimitReached,
}: MultiSelectDropdownProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [tempValues, setTempValues] = useState<string[]>(values);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && showActionButtons) {
      setTempValues(values);
    }
  }, [isOpen, values, showActionButtons]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (showActionButtons && isOpen) {
          onChange(tempValues);
        }
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);

      if (searchable && inputRef.current) {
        inputRef.current.focus();
      }

      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, searchable, showActionButtons, tempValues, onChange]);

  const optionsWithLower = useMemo(
    () =>
      options.map((opt) => ({
        ...opt,
        lowerLabel: opt.label.toLowerCase(),
      })),
    [options],
  );

  const valuesSet = useMemo(() => new Set(values), [values]);
  const tempValuesSet = useMemo(() => new Set(tempValues), [tempValues]);
  const selectedOptions = useMemo(
    () => options.filter((opt) => valuesSet.has(opt.value)),
    [options, valuesSet],
  );
  const displayText = useMemo(
    () =>
      selectedOptions.length === 0
        ? (placeholder ?? t('common.choose'))
        : selectedOptions.length === 1
          ? selectedOptions[0].label
          : t('common.selectedCount', { count: selectedOptions.length }),
    [selectedOptions, placeholder, t],
  );

  const filteredOptions = useMemo(() => {
    if (!searchable || !deferredSearchQuery) return optionsWithLower;
    const q = deferredSearchQuery.toLowerCase();
    return optionsWithLower.filter((option) => option.lowerLabel.includes(q));
  }, [optionsWithLower, searchable, deferredSearchQuery]);

  const RENDER_CHUNK = 50;
  const [visibleCount, setVisibleCount] = useState(RENDER_CHUNK);
  const optionsToRender =
    filteredOptions.length <= RENDER_CHUNK
      ? filteredOptions
      : filteredOptions.slice(0, visibleCount);

  useEffect(() => {
    if (!isOpen) {
      setVisibleCount(RENDER_CHUNK);
      return;
    }
    if (filteredOptions.length <= RENDER_CHUNK) return;
    const id = requestAnimationFrame(() => {
      setVisibleCount(filteredOptions.length);
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen, filteredOptions.length]);

  const handleToggle = useCallback(
    (optionValue: string) => {
      if (!optionValue || optionValue === '') {
        return;
      }

      if (optionValue === 'all') {
        const allOptionValues = options
          .filter((opt) => opt.value && opt.value !== 'all' && opt.value !== '')
          .map((opt) => opt.value);
        if (maxSelection !== undefined && allOptionValues.length > maxSelection) {
          onSelectionLimitReached?.();
          return;
        }
        if (showActionButtons) {
          setTempValues(allOptionValues);
        } else {
          onChange(allOptionValues);
        }
      } else {
        const currentValues = showActionButtons ? tempValues : values;
        if (currentValues.includes(optionValue)) {
          const newValues = currentValues.filter((v) => v !== optionValue);
          if (showActionButtons) {
            setTempValues(newValues);
          } else {
            onChange(newValues);
          }
        } else {
          const newValues = [...currentValues, optionValue];
          if (maxSelection !== undefined && newValues.length > maxSelection) {
            onSelectionLimitReached?.();
            return;
          }
          if (showActionButtons) {
            setTempValues(newValues);
          } else {
            onChange(newValues);
          }
        }
      }
    },
    [
      tempValues,
      values,
      options,
      showActionButtons,
      onChange,
      maxSelection,
      onSelectionLimitReached,
    ],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      if (!isOpen) {
        setIsOpen(true);
      }
    },
    [isOpen],
  );

  const handleInputFocus = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
    }
  }, [disabled]);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {searchable ? (
        <div className="relative group">
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchQuery : values.length > 0 ? displayText : ''}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            disabled={disabled}
            placeholder={isOpen ? '' : (placeholder ?? t('common.choose'))}
            className="input-field"
            style={{ paddingRight: '52px' }}
          />
          <svg
            className={`absolute top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-900 group-hover:text-primary-700 transition-colors duration-200 cursor-pointer ${
              isOpen ? 'rotate-180' : ''
            }`}
            style={{ right: '16px' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                if (isOpen && showActionButtons) {
                  onChange(tempValues);
                  setSearchQuery('');
                }
                setIsOpen((prev) => !prev);
              }
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      ) : (
        <button
          type="button"
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              if (isOpen && showActionButtons) {
                onChange(tempValues);
                setSearchQuery('');
              }
              setIsOpen((prev) => !prev);
            }
          }}
          disabled={disabled}
          className="input-field text-left cursor-pointer relative group"
          style={{ paddingRight: '52px' }}
        >
          <span
            className={`flex-1 truncate ${values.length > 0 ? 'text-text-primary' : 'text-hint'}`}
          >
            {displayText}
          </span>
          <svg
            className={`absolute top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-900 group-hover:text-primary-700 transition-colors duration-200 shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ right: '16px' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {isOpen && !disabled && (
        <div
          className="absolute w-full mt-1 top-full bg-white border-2 border-primary-500/30 rounded-lg shadow-xl overflow-hidden"
          style={{ zIndex: designTokens.zIndex.dropdown }}
        >
          <div className="max-h-96 overflow-auto scrollbar-custom">
            {filteredOptions.length > 0 ? (
              optionsToRender.map((option, index) => {
                const isSelected = showActionButtons
                  ? tempValuesSet.has(option.value)
                  : valuesSet.has(option.value);
                const isCategory =
                  option.category && (!option.value || option.value.startsWith('__category__'));
                const prevOption = index > 0 ? optionsToRender[index - 1] : null;
                const showCategoryHeader =
                  option.category && prevOption?.category !== option.category && !isCategory;
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
                      onClick={() => handleToggle(option.value)}
                      className={`w-full px-4 py-3 text-left text-text-primary hover:bg-primary-500/10 transition-colors duration-150 flex items-center justify-between ${
                        isSelected ? 'bg-primary-500/20' : ''
                      } ${isSelected ? 'font-semibold' : ''} ${option.category ? 'pl-8' : ''}`}
                    >
                      <span>{option.label}</span>
                      {isSelected && (
                        <svg
                          className="w-5 h-5 text-primary-900"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
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
            <div className="border-t border-divider pl-4 pr-2 py-1.5 flex items-center justify-between gap-2 bg-white">
              {maxSelection !== undefined ? (
                <span
                  className={`text-sm font-semibold ${
                    tempValues.length >= maxSelection ? 'text-red-400' : 'text-primary-900'
                  }`}
                >
                  {tempValues.length}/{maxSelection}
                </span>
              ) : (
                <span />
              )}
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  disabled={tempValues.length === 0}
                  onClick={() => {
                    setTempValues([]);
                    onChange([]);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className="p-2 text-text-primary font-medium hover:text-primary-500 transition-colors duration-200 flex items-center justify-center rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-text-primary"
                  aria-label={t('common.reset')}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(tempValues);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 text-sm text-text-primary font-medium hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 hover:bg-primary-500/20"
                >
                  {t('common.ok')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const MultiSelectDropdown = React.memo(MultiSelectDropdownComponent);
