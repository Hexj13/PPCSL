'use client';

import { useTranslation } from '@/hooks/useTranslation';

type ListingPageActionNewBadgeProps = { className?: string };

export function ListingPageActionNewBadge({ className = '' }: ListingPageActionNewBadgeProps) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-primary-200 bg-white/95 px-2 py-0.5 text-[11px] font-semibold leading-none text-primary-800 ${className}`.trim()}
    >
      {t('listingDetail.aiReportNewBadge')}
    </span>
  );
}
