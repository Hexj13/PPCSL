'use client';

import { useMemo } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import {
  SearchFilterCityIcon,
  SearchFilterPriceIcon,
} from '@/components/search/search-filters/search-filter-field-icons';
import { buildCityOptions } from '@/lib/options/city-options';
import type { Currency } from '@/lib/types';
import { CurrencyEnum } from '@/lib/types';
import { sortOptionsByLabel } from '@/lib/utils';
import { Checkbox } from '@/ui';

import { ListingFormTextInput } from './ListingFormTextInput';
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
  const cityOptions = useMemo(
    () =>
      buildCityOptions({
        cities,
        locale,
        popularLabel: t('searchFilters.popular'),
        otherLabel: t('searchFilters.other'),
      }),
    [cities, locale, t],
  );
  return (
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.priceAndLocation')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:auto-rows-min">
        <div className="sm:row-start-1 sm:col-span-1">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary-900 md:hidden">
            <SearchFilterPriceIcon />
            {t('listings.priceLabel')}
            <RequiredAsterisk filled={!!formData.price.trim()} />
          </label>
          <div className="flex flex-col gap-2">
            <ListingFormTextInput
              value={formData.price}
              onChange={(raw) => {
                clearError('price');
                const value = raw.replace(/[^0-9]/g, '');
                setFormData((prev) => ({ ...prev, price: value }));
              }}
              onBlur={(raw) => {
                const value = raw.trim();
                if (value && /^0+$/.test(value)) {
                  setFormData((prev) => ({
                    ...prev,
                    price: '0',
                  }));
                }
              }}
              onWheel={handleWheel}
              fieldLabel={t('listings.priceLabel')}
              fieldLabelIcon={<SearchFilterPriceIcon />}
              fieldLabelTrailing={<RequiredAsterisk filled={!!formData.price.trim()} />}
              inputMode="numeric"
              title={t('listings.priceTitle')}
              placeholder={t('listings.pricePlaceholder')}
              error={!!errors['price']}
              dataTestId="listing-form-price"
            />
            <MobileSelectField
              value={formData.currency}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, currency: value as Currency }))
              }
              sheetTitle={t('listings.currency')}
              className="w-full"
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
          <label className="mb-2 block text-sm font-semibold text-primary-900 md:hidden">
            {t('listings.downPaymentFrom')}{' '}
            <span className="text-text-secondary">{t('listings.optionalShort')}</span>
          </label>
          <ListingFormTextInput
            value={formData.down_payment_amount}
            onChange={(raw) => {
              const value = raw.replace(/[^0-9]/g, '');
              setFormData((prev) => ({ ...prev, down_payment_amount: value }));
            }}
            onBlur={(raw) => {
              const value = raw.trim();
              if (value && /^0+$/.test(value)) {
                setFormData((prev) => ({
                  ...prev,
                  down_payment_amount: '0',
                }));
              }
            }}
            onWheel={handleWheel}
            fieldLabel={`${t('listings.downPaymentFrom')} ${t('listings.optionalShort')}`}
            inputMode="numeric"
            disabled={!formData.available_in_credit}
            placeholder={t('listings.pricePlaceholder')}
            mobileClassName="w-full max-w-[200px]"
            dataTestId="listing-form-down-payment"
          />
        </div>

        <div className="sm:row-start-5 sm:col-span-1">
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
            options={cityOptions}
            dataTestId="listing-create-city-select"
          />
        </div>
      </div>
    </div>
  );
}
