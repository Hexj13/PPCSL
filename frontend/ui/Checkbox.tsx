'use client';

import { useId, type ReactNode } from 'react';

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
  'data-testid'?: string;
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
  'data-testid': dataTestId,
}: CheckboxProps) {
  const reactId = useId();
  const checkboxId = id ?? reactId;

  return (
    <div className={`flex items-center gap-3 group ${disabled ? 'opacity-50' : ''} ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          data-testid={dataTestId}
          onChange={(e) => {
            if (!disabled) {
              onChange(e.target.checked);
            }
          }}
          disabled={disabled}
          className="sr-only"
        />
        <label
          htmlFor={checkboxId}
          className={`${sizeClasses[size].box} rounded border-2 transition-all duration-200 flex items-center justify-center ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          } ${
            checked
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-divider bg-bg-secondary group-hover:border-primary-500'
          }`}
        >
          {checked && <CheckIcon className={`${sizeClasses[size].icon} text-primary-900`} />}
        </label>
      </div>
      {label && (
        <label
          htmlFor={checkboxId}
          className={`text-sm transition-colors duration-200 cursor-pointer ${
            checked ? 'text-primary-700' : 'text-text-secondary group-hover:text-text-secondary'
          } ${labelClassName}`}
        >
          {label}
        </label>
      )}
    </div>
  );
}
