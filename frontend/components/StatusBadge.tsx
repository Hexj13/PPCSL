'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { getStatusConfig } from '@/lib/status-utils';
import { ListingStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: ListingStatus;
  showLabel?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({
  status,
  showLabel = true,
  className = '',
  size = 'md',
}: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2 py-1.5',
    lg: 'text-base px-3 py-2',
  };

  return (
    <div
      className={`${showLabel ? 'bg-bg-base/95 backdrop-blur-sm px-2 py-2 rounded-lg border border-primary-500/30 inline-flex items-center gap-1.5' : ''} ${className}`}
    >
      {showLabel && (
        <div className="text-xs font-semibold text-gray-200">{t('statusBadge.status')}</div>
      )}
      <div className={`${config.textColor} font-bold ${sizeClasses[size]}`}>
        {t(config.labelKey)}
      </div>
    </div>
  );
}
