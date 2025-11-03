interface StatusBadgeProps {
  status: 'Active' | 'Paused' | 'Closed';
  showLabel?: boolean;
  className?: string;
}

export function StatusBadge({ status, showLabel = true, className = '' }: StatusBadgeProps) {
  const statusConfig = {
    Active: {
      text: 'Активна',
      textColor: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/40',
    },
    Paused: {
      text: 'Привремено застарена',
      textColor: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/40',
    },
    Closed: {
      text: 'Затворена',
      textColor: 'text-gray-200',
      bgColor: 'bg-gray-500/20',
      borderColor: 'border-gray-500/40',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`${showLabel ? 'bg-bg-dark/95 backdrop-blur-sm px-2 py-2 rounded-lg border border-primary-500/30 inline-flex items-center gap-1.5' : ''} ${className}`}>
      {showLabel && <div className="text-xs font-semibold text-gray-200">Статус:</div>}
      <div className={`${config.textColor} font-bold text-sm`}>
        {config.text}
      </div>
    </div>
  );
}
