'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/ui';

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
}

function MultiSelectDropdownComponent({
  values,
  onChange,
  options,
  disabled = false,
  placeholder = 'Избери...',
  className = '',
  searchable = false,
  showActionButtons = false,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const valuesSet = useMemo(() => new Set(values), [values]);
  const tempValuesSet = useMemo(() => new Set(tempValues), [tempValues]);
  const selectedOptions = useMemo(
    () => options.filter((opt) => valuesSet.has(opt.value)),
    [options, valuesSet]
  );
  const displayText = useMemo(
    () =>
      selectedOptions.length === 0
        ? placeholder
        : selectedOptions.length === 1
          ? selectedOptions[0].label
          : `Избрани ${selectedOptions.length}`,
    [selectedOptions, placeholder]
  );

  const filteredOptions = useMemo(
    () =>
      searchable && searchQuery
        ? options.filter((option) => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : options,
    [options, searchable, searchQuery]
  );

  const handleToggle = useCallback(
    (optionValue: string) => {
      if (!optionValue || optionValue === '') {
        return;
      }

      if (optionValue === 'all') {
        const allOptionValues = options
          .filter((opt) => opt.value && opt.value !== 'all' && opt.value !== '')
          .map((opt) => opt.value);
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
          if (showActionButtons) {
            setTempValues(newValues);
          } else {
            onChange(newValues);
          }
        }
      }
    },
    [tempValues, values, options, showActionButtons, onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      if (!isOpen) {
        setIsOpen(true);
      }
    },
    [isOpen]
  );

  const handleInputFocus = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
    }
  }, [disabled]);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {searchable ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchQuery : values.length > 0 ? displayText : ''}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            disabled={disabled}
            placeholder={placeholder}
            className="input-field"
            style={{ paddingRight: '44px' }}
          />
          <svg
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400 transition-transform duration-200 cursor-pointer ${
              isOpen ? 'rotate-180' : ''
            }`}
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
          className="input-field text-left cursor-pointer relative"
          style={{ paddingRight: '44px' }}
        >
          <span className={`flex-1 truncate ${values.length > 0 ? 'text-white' : 'text-hint'}`}>
            {displayText}
          </span>
          <svg
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {isOpen && !disabled && (
        <div className="absolute z-[100] w-full mt-1 top-full bg-bg-light border-2 border-primary-500/30 rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-96 overflow-auto scrollbar-custom">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = showActionButtons
                  ? tempValuesSet.has(option.value)
                  : valuesSet.has(option.value);
                const isCategory = option.category && !option.value;
                const prevOption = index > 0 ? filteredOptions[index - 1] : null;
                const showCategoryHeader =
                  option.category && prevOption?.category !== option.category;
                const isFirstCategory = showCategoryHeader && index === 0;

                if (isCategory) {
                  return (
                    <div
                      key={`category-${option.category}-${index}`}
                      className={`px-4 py-2 text-primary-400 font-semibold text-sm sticky top-0 bg-bg-light z-10 border-b border-primary-500/20 pointer-events-none ${
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
                        className={`px-4 py-2 text-primary-400 font-semibold text-sm sticky top-0 bg-bg-light z-10 border-b border-primary-500/20 pointer-events-none ${
                          isFirstCategory ? 'rounded-t-lg' : ''
                        }`}
                      >
                        {option.category}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggle(option.value)}
                      className={`w-full px-4 py-3 text-left text-white hover:bg-primary-500/30 transition-colors duration-150 flex items-center justify-between ${
                        isSelected ? 'bg-primary-800' : ''
                      } ${isSelected ? 'font-semibold' : ''} ${option.category ? 'pl-8' : ''}`}
                    >
                      <span>{option.label}</span>
                      {isSelected && (
                        <svg
                          className="w-5 h-5 text-primary-400"
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
              <div className="px-4 py-3 text-gray-400 text-center">Не се пронајдени резултати</div>
            )}
          </div>
          {showActionButtons && (
            <div className="border-t border-primary-500/30 px-2 py-1.5 flex justify-end gap-1.5 bg-bg-dark">
              <button
                type="button"
                onClick={() => {
                  setTempValues([]);
                  onChange([]);
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className="px-3 py-1.5 text-sm text-white hover:text-primary-400 transition-colors duration-150"
              >
                Ресетирај
              </button>
              <Button
                variant="primary"
                size="xs"
                onClick={() => {
                  onChange(tempValues);
                  setIsOpen(false);
                  setSearchQuery('');
                }}
              >
                Ок
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const MultiSelectDropdown = React.memo(MultiSelectDropdownComponent);
