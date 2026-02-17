'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  message: string | ReactNode;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({
  message,
  actionLabel,
  actionHref,
  actionOnClick,
  icon,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <p className="text-lg mb-6" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
        {message}
      </p>
      {actionLabel && (
        <>
          {actionHref ? (
            <Link
              href={actionHref}
              className="text-primary-400 font-medium text-sm md:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 inline-block"
            >
              {actionLabel}
            </Link>
          ) : actionOnClick ? (
            <button
              onClick={actionOnClick}
              className="text-primary-400 font-medium text-sm md:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 inline-block"
            >
              {actionLabel}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
