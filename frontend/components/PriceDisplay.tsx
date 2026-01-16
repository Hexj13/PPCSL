import { useTranslation } from '@/hooks/useTranslation';
import { formatPrice } from '@/lib/utils';

interface PriceDisplayProps {
  price: number;
  currency: string;
  size?: 'small' | 'medium' | 'large';
  showCurrency?: boolean;
  urgent?: boolean;
  className?: string;
}

export function PriceDisplay({
  price,
  currency,
  size = 'medium',
  showCurrency = true,
  urgent = false,
  className = '',
}: PriceDisplayProps) {
  const { t } = useTranslation();
  const sizeClasses = {
    small: 'text-xl md:text-2xl',
    medium: 'text-2xl md:text-3xl',
    large: 'text-3xl sm:text-4xl md:text-5xl',
  };

  const currencySizeClasses = {
    small: 'text-xs md:text-sm',
    medium: 'text-sm',
    large: 'text-lg md:text-xl',
  };

  return (
    <div className={className}>
      <div className="flex items-baseline gap-2 md:gap-3">
        <span className={`${sizeClasses[size]} font-extrabold text-primary-700`}>
          {formatPrice(price, currency)}
        </span>
        {showCurrency && (
          <span className={`${currencySizeClasses[size]} text-gray-400 font-medium`}>
            {currency}
          </span>
        )}
      </div>
      {urgent && (
        <div className="mt-1.5 md:mt-2">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-sm font-semibold bg-primary-500/20 border border-primary-500/40 text-primary-300 shadow-sm">
            <span>🔥</span>
            <span>{t('listings.urgent')}</span>
          </span>
        </div>
      )}
    </div>
  );
}
