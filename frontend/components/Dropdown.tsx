'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/ui';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (_value: string) => void;
  options: DropdownOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  searchable?: boolean;
  showActionButtons?: boolean;
  error?: boolean;
}

function DropdownComponent({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = '',
  className = '',
  searchable = false,
  showActionButtons = false,
  error = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempValue, setTempValue] = useState<string>(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isOpen && showActionButtons) {
      setTempValue(value);
    }
  }, [isOpen, value, showActionButtons]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
  }, [isOpen, searchable]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );
  const displayText = useMemo(
    () => (selectedOption ? selectedOption.label : placeholder),
    [selectedOption, placeholder]
  );

  const filteredOptions = useMemo(
    () =>
      searchable && searchQuery
        ? options.filter((option) => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : options,
    [options, searchable, searchQuery]
  );

  const handleSelect = useCallback(
    (optionValue: string) => {
      if (showActionButtons) {
        setTempValue(optionValue);
      } else {
        onChange(optionValue);
        setIsOpen(false);
        setSearchQuery('');
      }
    },
    [showActionButtons, onChange]
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
            value={isOpen ? searchQuery : displayText}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            disabled={disabled}
            placeholder={isOpen ? '' : placeholder}
            className={`input-field ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
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
                  onChange(tempValue);
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
                onChange(tempValue);
                setSearchQuery('');
              }
              setIsOpen((prev) => !prev);
            }
          }}
          disabled={disabled}
          className={`input-field dropdown-button text-left cursor-pointer relative ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
        >
          <span
            className={`flex-1 truncate min-w-0 pr-2 ${value ? 'text-white' : 'text-gray-400'}`}
          >
            {displayText}
          </span>
          <svg
            className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400 transition-transform duration-200 flex-shrink-0 pointer-events-none ${
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
        <div className="absolute z-[100] w-full mt-1 top-full bg-bg-light border-2 border-primary-500/30 rounded-lg shadow-xl">
          <div className="max-h-96 overflow-auto scrollbar-custom">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = showActionButtons
                  ? option.value === tempValue
                  : option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-4 py-3 text-left text-white hover:bg-primary-500/30 transition-colors duration-150 flex items-center justify-between ${
                      isSelected ? 'bg-primary-800' : ''
                    } ${isSelected ? 'font-semibold' : ''}`}
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
                  const emptyValue = '';
                  setTempValue(emptyValue);
                  onChange(emptyValue);
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
                  onChange(tempValue);
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

export const Dropdown = React.memo(DropdownComponent);
