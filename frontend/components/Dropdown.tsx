'use client';

import { useState, useRef, useEffect } from 'react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  searchable?: boolean;
}

export function Dropdown({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = '',
  className = '',
  searchable = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      if (searchable && inputRef.current) {
        inputRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, searchable]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const filteredOptions =
    searchable && searchQuery
      ? options.filter((option) => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
      : options;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

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
            placeholder={placeholder}
            className={`w-full px-4 py-3 border-2 border-primary-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-bg-light text-white placeholder:text-gray-400 h-[48px] ${
              disabled ? 'cursor-not-allowed opacity-60' : ''
            } ${isOpen ? 'border-primary-500 ring-2 ring-primary-500' : ''}`}
            style={{ paddingRight: '2.75rem' }}
          />
          <svg
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400 transition-transform duration-200 pointer-events-none ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-4 py-3 border-2 border-primary-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-bg-light text-white cursor-pointer text-left h-[48px] flex items-center overflow-hidden ${
            disabled ? 'cursor-not-allowed opacity-60' : ''
          } ${isOpen ? 'border-primary-500 ring-2 ring-primary-500' : ''}`}
          style={{ paddingRight: '2.75rem' }}
        >
          <span className={`flex-1 truncate ${value ? 'text-white' : 'text-gray-400'}`}>
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
        <div className="absolute z-[100] w-full mt-1 top-full bg-bg-light border-2 border-primary-500/30 rounded-lg shadow-xl max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full px-4 py-3 text-left text-white hover:bg-primary-500/30 transition-colors duration-150 flex items-center justify-between ${
                  option.value === value ? 'bg-primary-700' : ''
                } ${option.value === value ? 'font-semibold' : ''}`}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <svg className="w-5 h-5 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-gray-400 text-center">Не се пронајдени резултати</div>
          )}
        </div>
      )}
    </div>
  );
}
