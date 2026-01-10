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
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  id,
  className = '',
  labelClassName = '',
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
          className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          } ${
            checked
              ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
              : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
          }`}
        >
          {checked && <CheckIcon className="w-3 h-3 text-white" />}
        </div>
      </div>
      {label && (
        <label
          htmlFor={checkboxId}
          className={`text-sm transition-colors duration-200 cursor-pointer ${
            checked ? 'text-primary-400' : 'text-gray-400 group-hover:text-gray-300'
          } ${labelClassName}`}
        >
          {label}
        </label>
      )}
    </div>
  );
}
