import { useTranslation } from '@/hooks/useTranslation';

interface StatusBadgeProps {
  status: 'Active' | 'Paused' | 'Closed';
  showLabel?: boolean;
  className?: string;
}

export function StatusBadge({ status, showLabel = true, className = '' }: StatusBadgeProps) {
  const { t } = useTranslation();
  const statusConfig = {
    Active: {
      text: t('statusBadge.active'),
      textColor: 'text-primary-400',
      bgColor: 'bg-primary-500/20',
      borderColor: 'border-primary-500/40',
    },
    Paused: {
      text: t('statusBadge.paused'),
      textColor: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/40',
    },
    Closed: {
      text: t('statusBadge.closed'),
      textColor: 'text-gray-200',
      bgColor: 'bg-gray-500/20',
      borderColor: 'border-gray-500/40',
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`${showLabel ? 'bg-bg-dark/95 backdrop-blur-sm px-2 py-2 rounded-lg border border-primary-500/30 inline-flex items-center gap-1.5' : ''} ${className}`}
    >
      {showLabel && (
        <div className="text-xs font-semibold text-gray-200">{t('statusBadge.status')}</div>
      )}
      <div className={`${config.textColor} font-bold text-sm`}>{config.text}</div>
    </div>
  );
}
