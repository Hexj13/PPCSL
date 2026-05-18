'use client';

import type { ReactNode } from 'react';

interface FilterRowProps {
  label: string;
  valueSummary: string;
  placeholder?: string;
  disabled?: boolean;
  onClick: () => void;
  leadingIcon?: ReactNode;
}

export function FilterRow({
  label,
  valueSummary,
  placeholder,
  disabled = false,
  onClick,
  leadingIcon,
}: FilterRowProps) {
  const display = valueSummary.trim() !== '' ? valueSummary : (placeholder ?? '');

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-12 w-full items-center justify-between gap-3 rounded-lg border-2 border-primary-500/25 bg-bg-base px-4 text-left disabled:cursor-not-allowed disabled:opacity-50 hover-only:hover:border-primary-600/50 transition-colors"
    >
      <span className="flex items-center gap-2 min-w-0 shrink">
        {leadingIcon ? (
          <span className="shrink-0 text-primary-700 [&_svg]:block" aria-hidden>
            {leadingIcon}
          </span>
        ) : null}
        <span className="text-sm font-semibold text-primary-900 truncate">{label}</span>
      </span>
      <span className="flex items-center gap-2 min-w-0 flex-1 justify-end">
        <span
          className={`text-sm truncate ${valueSummary.trim() !== '' ? 'text-text-primary' : 'text-hint'}`}
        >
          {display}
        </span>
        <svg
          className="w-5 h-5 shrink-0 text-primary-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </button>
  );
}
