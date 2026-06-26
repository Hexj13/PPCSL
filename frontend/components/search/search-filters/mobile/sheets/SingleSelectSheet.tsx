'use client';

import { BOTTOM_SHEET_LIST_SCROLL_CLASS } from '@/lib/bottom-sheet-layout';

interface SingleSelectOption {
  value: string;
  label: string;
}

interface SingleSelectSheetContentProps {
  options: SingleSelectOption[];
  value: string;
  onChange: (_value: string) => void;
}

export function SingleSelectSheetContent({
  options,
  value,
  onChange,
}: SingleSelectSheetContentProps) {
  return (
    <div
      data-bottom-sheet-scrollable="true"
      className={`${BOTTOM_SHEET_LIST_SCROLL_CLASS} max-h-full`}
    >
      {options.map((option, index) => {
        const normalizedValue = value ?? '';
        const selected =
          option.value === '' ? normalizedValue === '' : option.value === normalizedValue;
        const optionDisabled = Boolean(normalizedValue) && !selected;
        return (
          <button
            key={option.value === '' ? `empty-${index}` : option.value}
            type="button"
            disabled={optionDisabled}
            data-testid={option.value === '' ? undefined : `search-sheet-option-${option.value}`}
            onClick={() => onChange(selected ? '' : option.value)}
            className={`w-full px-4 py-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-between gap-2 ${
              optionDisabled ? '' : 'hover:bg-primary-500/10'
            } ${selected ? 'bg-primary-500/15 font-semibold' : ''}`}
          >
            <span>{option.label}</span>
            {selected ? (
              <svg
                className="w-5 h-5 shrink-0 text-primary-900"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
