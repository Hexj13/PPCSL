'use client';

import { useTranslation } from '@/hooks/useTranslation';

export function ImageCounter({
  current,
  total,
  className,
}: {
  current: number;
  total: number;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={`pointer-events-none absolute bottom-3 left-1/2 z-[6] -translate-x-1/2 rounded-full bg-primary-900/80 px-2 py-0.5 text-xs font-semibold text-primary-50 shadow-md ${className ?? ''}`}
      aria-hidden
    >
      {t('listings.cardImageCounter', {
        current: String(current),
        total: String(total),
      })}
    </span>
  );
}
