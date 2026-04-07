'use client';

import { Dropdown } from '@/components/common/Dropdown';
import { useI18n } from '@/components/providers/I18nProvider';
import type { Currency } from '@/lib/types';
import { CurrencyEnum } from '@/lib/types';
import { sortOptionsByLabel } from '@/lib/utils';
import { Checkbox } from '@/ui';

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
          <label className="block text-sm font-semibold mb-2 text-primary-700 flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="shrink-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12.04"
                cy="12"
                r="2.87"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="1.92"
                strokeLinecap="square"
              />
              <path
                d="M22.58,6.25v9.58a2.87,2.87,0,0,1-2.87,2.88H7.25l3.83,3.83"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="1.92"
              />
              <line
                x1="4.38"
                y1="12"
                x2="6.29"
                y2="12"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="1.92"
              />
              <line
                x1="17.79"
                y1="12"
                x2="19.71"
                y2="12"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="1.92"
              />
              <path
                d="M1.5,17.75V8.17A2.88,2.88,0,0,1,4.38,5.29H16.83L13,1.46"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="1.92"
              />
            </svg>
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
            <Dropdown
              value={formData.currency}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, currency: value as Currency }))
              }
              className="w-32 shrink-0"
              placeholder={t('searchFilters.allCurrencies')}
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
          <label className="block text-sm font-semibold mb-2 text-primary-700">
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
          <label className="block text-sm font-semibold mb-2 text-primary-700 flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="shrink-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.7 15C4.03377 15.6353 3 16.5205 3 17.4997C3 19.4329 7.02944 21 12 21C16.9706 21 21 19.4329 21 17.4997C21 16.5205 19.9662 15.6353 18.3 15M12 9H12.01M18 9C18 13.0637 13.5 15 12 18C10.5 15 6 13.0637 6 9C6 5.68629 8.68629 3 12 3C15.3137 3 18 5.68629 18 9ZM13 9C13 9.55228 12.5523 10 12 10C11.4477 10 11 9.55228 11 9C11 8.44772 11.4477 8 12 8C12.5523 8 13 8.44772 13 9Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t('listings.cityLabel')}
            <RequiredAsterisk filled={!!formData.city} />
          </label>
          <Dropdown
            value={formData.city}
            onChange={(value) => {
              clearError('city');
              setFormData((prev) => ({ ...prev, city: value }));
            }}
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
