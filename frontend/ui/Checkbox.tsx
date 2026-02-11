'use client';

import { ReactNode } from 'react';

import { CheckIcon } from './icons';

export interface CheckboxProps {
  checked: boolean;
  onChange: (_checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
  labelClassName?: string;
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: { box: 'w-5 h-5', icon: 'w-3 h-3' },
  md: { box: 'w-6 h-6', icon: 'w-4 h-4' },
};

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  id,
  className = '',
  labelClassName = '',
  size = 'sm',
}: CheckboxProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled) {
      onChange(!checked);
    }
  };

  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`flex items-center gap-3 group ${disabled ? 'opacity-50' : ''} ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={(e) => {
            if (!disabled) {
              onChange(e.target.checked);
            }
          }}
          disabled={disabled}
          className="sr-only"
        />
        <div
          onClick={handleClick}
          className={`${sizeClasses[size].box} rounded border-2 transition-all duration-200 flex items-center justify-center ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          } ${
            checked
              ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
              : 'border-divider bg-bg-secondary group-hover:border-primary-500'
          }`}
        >
          {checked && <CheckIcon className={`${sizeClasses[size].icon} text-white`} />}
        </div>
      </div>
      {label && (
        <label
          htmlFor={checkboxId}
          className={`text-sm transition-colors duration-200 cursor-pointer ${
            checked ? 'text-primary-400' : 'text-text-secondary group-hover:text-text-secondary'
          } ${labelClassName}`}
        >
          {label}
        </label>
      )}
    </div>
  );
}
