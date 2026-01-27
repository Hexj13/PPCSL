'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
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
  buttonClassName?: string;
  searchable?: boolean;
  showActionButtons?: boolean;
  error?: boolean;
  autoPosition?: boolean;
}

function DropdownComponent({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = '',
  className = '',
  buttonClassName = '',
  searchable = false,
  showActionButtons = false,
  error = false,
  autoPosition = false,
}: DropdownProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [tempValue, setTempValue] = useState<string>(value);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isOpen && showActionButtons) {
      setTempValue(value);
    }
  }, [isOpen, value, showActionButtons]);

  useEffect(() => {
    if (!isOpen) {
      setIsPositioned(false);
      return;
    }

    if (autoPosition && dropdownRef.current && menuRef.current) {
      setIsPositioned(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!dropdownRef.current || !menuRef.current) return;

          const triggerRect = dropdownRef.current.getBoundingClientRect();
          const menuHeight = menuRef.current.offsetHeight;
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - triggerRect.bottom;
          const spaceAbove = triggerRect.top;

          if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
            setOpenUpwards(true);
          } else {
            setOpenUpwards(false);
          }
          setIsPositioned(true);
        });
      });
    } else {
      setOpenUpwards(false);
      setIsPositioned(true);
    }
  }, [autoPosition, isOpen, options.length]);

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
    () => options.find((opt) => opt.value === value) || null,
    [options, value]
  );
  const displayText = useMemo(
    () => (selectedOption ? selectedOption.label : placeholder),
    [selectedOption, placeholder]
  );

  const filteredOptions = useMemo(
    () =>
      searchable && deferredSearchQuery
        ? options.filter((option) =>
            option.label.toLowerCase().includes(deferredSearchQuery.toLowerCase())
          )
        : options,
    [options, searchable, deferredSearchQuery]
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
    <div ref={dropdownRef} className={`relative ${className || ''}`} suppressHydrationWarning>
      {searchable ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchQuery : selectedOption ? displayText : ''}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            disabled={disabled}
            placeholder={isOpen ? '' : placeholder}
            className={`input-field ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${selectedOption ? 'text-text-primary' : ''}`}
            style={{ paddingRight: '52px', color: selectedOption ? undefined : '#9ca3af' }}
          />
          <svg
            className={`absolute top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400 transition-transform duration-200 cursor-pointer ${
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
          disabled={disabled ? true : undefined}
          className={`input-field dropdown-button text-left cursor-pointer relative ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${buttonClassName || ''}`}
          style={buttonClassName ? { paddingRight: '52px' } : { paddingRight: '52px' }}
          suppressHydrationWarning
        >
          <span
            className="flex-1 truncate min-w-0 text-text-primary"
            style={!selectedOption ? { color: '#9ca3af' } : undefined}
            suppressHydrationWarning
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
            style={{ right: '16px' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {isOpen && !disabled && (
        <div
          ref={menuRef}
          className={`absolute z-[100] w-full bg-white border-2 border-primary-500/30 rounded-lg shadow-xl ${
            openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'
          } ${!isPositioned ? 'opacity-0 pointer-events-none' : ''}`}
        >
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
                    className={`w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-primary-500/10 transition-colors duration-150 flex items-center justify-between ${
                      isSelected ? 'bg-primary-500/20' : ''
                    } ${isSelected ? 'font-semibold' : ''}`}
                  >
                    <span>{option.label}</span>
                  </button>
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
                onClick={() => {
                  const emptyValue = '';
                  setTempValue(emptyValue);
                  onChange(emptyValue);
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className="px-3 py-1.5 text-sm text-text-primary hover:text-primary-500 transition-colors duration-150"
              >
                {t('common.reset')}
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
                {t('common.ok')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const Dropdown = React.memo(DropdownComponent);
