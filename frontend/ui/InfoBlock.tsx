'use client';

import type { ReactNode } from 'react';

export interface InfoBlockProps {
  children: ReactNode;
  title?: ReactNode;
  variant?: 'info' | 'warning';
  className?: string;
}

export function InfoBlock({ children, title, variant = 'info', className = '' }: InfoBlockProps) {
  return (
    <div className={`bg-primary-500/10 border border-primary-900 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        {variant === 'info' ? <InfoIcon /> : <WarningIcon />}
        <div className="min-w-0">
          {title && <div className="text-sm font-semibold text-primary-700 mb-1">{title}</div>}
          <div className="text-sm text-primary-900 leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg
      className="w-5 h-5 text-primary-900 shrink-0 mt-0.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      className="w-5 h-5 text-primary-900 shrink-0 mt-0.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}
