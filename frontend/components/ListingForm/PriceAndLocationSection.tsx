'use client';

import { useI18n } from '@/components/providers/I18nProvider';
import {
  SearchFilterCityIcon,
  SearchFilterPriceIcon,
} from '@/components/search/search-filters/search-filter-field-icons';
import type { Currency } from '@/lib/types';
import { CurrencyEnum } from '@/lib/types';
import { sortOptionsByLabel } from '@/lib/utils';
import { Checkbox } from '@/ui';

import { MobileSelectField } from './MobileSelectField';
import { RequiredAsterisk } from './RequiredAsterisk';
import type { ListingFormSectionProps } from './types';

const CURRENCY_OPTIONS = sortOptionsByLabel([
  { value: CurrencyEnum.EUR, label: 'EUR' },
  { value: CurrencyEnum.MDL, label: 'MDL' },
]);

export function PriceAndLocationSection({
  formData,
  setFormData,
  errors,
  clearError,
  t,
  cities = [],
  handleWheel,
}: ListingFormSectionProps) {
  const { locale } = useI18n();
  return (
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.priceAndLocation')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:auto-rows-min">
        <div className="sm:row-start-1 sm:col-span-1">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary-900">
            <SearchFilterPriceIcon />
            {t('listings.priceLabel')}
            <RequiredAsterisk filled={!!formData.price.trim()} />
          </label>
          <div className="flex flex-row flex-nowrap gap-2">
            <input
              type="text"
              required
              min="0"
              max="999999999"
              value={formData.price}
              data-testid="listing-form-price"
              onChange={(e) => {
                clearError('price');
                const value = e.target.value.replace(/[^0-9]/g, '');
                setFormData((prev) => ({ ...prev, price: value }));
              }}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && /^0+$/.test(value)) {
                  setFormData((prev) => ({
                    ...prev,
                    price: '0',
                  }));
                }
              }}
              onWheel={handleWheel}
              className={`input-field flex-1 min-w-0 h-[48px] ${errors['price'] ? 'border-red-500 focus:border-red-500 ' : ''}`}
              placeholder={t('listings.pricePlaceholder')}
              title={t('listings.priceTitle')}
            />
            <MobileSelectField
              value={formData.currency}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, currency: value as Currency }))
              }
              sheetTitle={t('listings.currency')}
              leadingIcon={<SearchFilterPriceIcon />}
              className="w-32 shrink-0"
              mobileValueOnlyTrigger={true}
              autoPosition={true}
              menuMaxHeight={300}
              options={CURRENCY_OPTIONS}
              dataTestId="listing-create-currency-select"
            />
          </div>
        </div>

        <div className="sm:row-start-2 sm:col-span-1">
          <Checkbox
            id="listing-negotiable"
            size="md"
            checked={formData.negotiable}
            onChange={(checked) => {
              setFormData((prev) => ({
                ...prev,
                negotiable: checked,
              }));
            }}
            label={t('listings.negotiable')}
            data-testid="listing-form-negotiable"
          />
        </div>

        <div className="sm:row-start-3 sm:col-span-1">
          <Checkbox
            id="listing-available-in-credit"
            size="md"
            checked={formData.available_in_credit}
            onChange={(checked) => {
              setFormData((prev) => ({
                ...prev,
                available_in_credit: checked,
                ...(checked ? {} : { down_payment_amount: '' }),
              }));
            }}
            label={t('listings.availableInCredit')}
            data-testid="listing-form-available-in-credit"
          />
        </div>

        <div className="sm:row-start-4 sm:col-span-1">
          <label className="block text-sm font-semibold mb-2 text-primary-900">
            {t('listings.downPaymentFrom')}{' '}
            <span className="text-text-secondary">{t('listings.optionalShort')}</span>
          </label>
          <input
            type="text"
            min="0"
            max="999999999"
            value={formData.down_payment_amount}
            disabled={!formData.available_in_credit}
            data-testid="listing-form-down-payment"
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              setFormData((prev) => ({ ...prev, down_payment_amount: value }));
            }}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value && /^0+$/.test(value)) {
                setFormData((prev) => ({
                  ...prev,
                  down_payment_amount: '0',
                }));
              }
            }}
            onWheel={handleWheel}
            className="input-field h-[48px] w-full max-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={t('listings.pricePlaceholder')}
          />
        </div>

        <div className="sm:row-start-5 sm:col-span-1">
          <label className="mb-2 hidden items-center gap-2 text-sm font-semibold text-primary-900 md:flex">
            <SearchFilterCityIcon />
            {t('listings.cityLabel')}
            <RequiredAsterisk filled={!!formData.city} />
          </label>
          <MobileSelectField
            value={formData.city}
            onChange={(value) => {
              clearError('city');
              setFormData((prev) => ({ ...prev, city: value }));
            }}
            sheetTitle={t('listings.cityLabel')}
            leadingIcon={<SearchFilterCityIcon />}
            requiredAsteriskFilled={!!formData.city}
            searchable={true}
            placeholder={t('listings.selectCity')}
            error={!!errors['city']}
            autoPosition={true}
            menuMaxHeight={300}
            options={cities.map((city) => {
              let label: string;
              if (locale === 'ro') {
                label = city.name;
              } else if (locale === 'ru' && city.nameRu) {
                label = `${city.nameRu} (${city.name})`;
              } else {
                label = city.name;
              }
              return {
                value: city.nameEn,
                label,
              };
            })}
            dataTestId="listing-create-city-select"
          />
        </div>
      </div>
    </div>
  );
}
