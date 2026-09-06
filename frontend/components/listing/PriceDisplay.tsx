import { useTranslation } from '@/hooks/useTranslation';
import { getCurrencyDisplayCode } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';

interface PriceDisplayProps {
  price: number;
  currency: string;
  approxPrice?: number | null;
  defaultCurrencyCode?: string;
  size?: 'xs' | 'small' | 'medium' | 'large';
  showCurrency?: boolean;
  urgent?: boolean;
  approxPriceBelow?: boolean;
  className?: string;
  priceClassName?: string;
  currencyClassName?: string;
  currencyStyle?: React.CSSProperties;
}

export function PriceDisplay({
  price,
  currency,
  approxPrice,
  defaultCurrencyCode,
  size = 'medium',
  showCurrency = true,
  urgent = false,
  approxPriceBelow = false,
  className = '',
  priceClassName = 'text-primary-700',
  currencyClassName,
  currencyStyle,
}: PriceDisplayProps) {
  const { t } = useTranslation();
  const sizeClasses = {
    xs: 'text-base',
    small: 'text-xl md:text-2xl',
    medium: 'text-2xl md:text-3xl',
    large: 'text-3xl sm:text-4xl md:text-5xl',
  };

  const currencySizeClasses = {
    xs: 'text-[11px]',
    small: 'text-xs md:text-sm',
    medium: 'text-sm',
    large: 'text-lg md:text-xl',
  };

  const displayCurrency = getCurrencyDisplayCode(currency);
  const displayDefaultCurrency = getCurrencyDisplayCode(defaultCurrencyCode);

  const approxBlock = approxPrice != null && displayDefaultCurrency && (
    <span className="text-sm font-normal" style={{ color: 'rgb(var(--gray-400-rgb))' }}>
      {t('listings.approxPriceWithCurrency', {
        price: formatPrice(approxPrice),
        currency: displayDefaultCurrency,
      })}
    </span>
  );

  return (
    <div className={className}>
      <div className="flex items-baseline gap-2 md:gap-3 flex-wrap">
        <span className={`${sizeClasses[size]} font-extrabold ${priceClassName}`}>
          {formatPrice(price, currency)}
        </span>
        {showCurrency && (
          <span
            className={`${currencySizeClasses[size]} font-medium ${currencyClassName ?? 'text-gray-400'}`}
            style={currencyStyle}
          >
            {displayCurrency}
          </span>
        )}
        {!approxPriceBelow && approxBlock}
      </div>
      {approxPriceBelow && approxBlock}
      {urgent && (
        <div className="mt-1.5 md:mt-2">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-sm font-semibold bg-primary-500/20 border border-primary-500/40 text-primary-300 shadow-xs">
            <span>🔥</span>
            <span>{t('listings.urgent')}</span>
          </span>
        </div>
      )}
    </div>
  );
}
