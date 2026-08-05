'use client';

import { useMemo } from 'react';

import { ListingFormTextInput } from '@/components/ListingForm/ListingFormTextInput';
import { MobileSelectField } from '@/components/ListingForm/MobileSelectField';
import { useI18n } from '@/components/providers/I18nProvider';
import {
  SearchFilterCityIcon,
  SearchFilterPriceIcon,
} from '@/components/search/search-filters/search-filter-field-icons';
import { getCurrencyDisplayCode } from '@/lib/constants';
import { buildCityOptions } from '@/lib/options/city-options';
import { loadSiteConfigSync } from '@/lib/site-config';
import type { Currency } from '@/lib/types';
import { getCountry } from '@/lib/utils';
import { Checkbox } from '@/ui';

import { RequiredAsterisk } from './RequiredAsterisk';
import type { TireListingFormData } from './tireListingFormTypes';

interface TirePriceAndLocationSectionProps {
  formData: TireListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<TireListingFormData>>;
  errors: Record<string, boolean>;
  clearError: (_field: string) => void;
  t: (_key: string, _params?: Record<string, string | number>) => string;
  cities: Array<{ name: string; nameEn: string; nameRu?: string }>;
  handleWheel: (_e: React.WheelEvent<HTMLInputElement>) => void;
}

export function TirePriceAndLocationSection({
  formData,
  setFormData,
  errors,
  clearError,
  t,
  cities = [],
  handleWheel,
}: TirePriceAndLocationSectionProps) {
  const { locale } = useI18n();
  const currencyOptions = useMemo(
    () =>
      loadSiteConfigSync(getCountry()).currencies.map((code) => ({
        value: code,
        label: getCurrencyDisplayCode(code),
      })),
    [],
  );
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
              title={t('listings.tireForm.priceTitle')}
              placeholder={t('listings.pricePlaceholder')}
              error={!!errors['price']}
              dataTestId="tire-listing-form-price"
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
              options={currencyOptions}
            />
          </div>
        </div>

        <div className="sm:row-start-2 sm:col-span-1">
          <Checkbox
            id="tire-listing-negotiable"
            size="md"
            checked={formData.negotiable}
            onChange={(checked) => {
              setFormData((prev) => ({
                ...prev,
                negotiable: checked,
              }));
            }}
            label={t('listings.negotiable')}
            data-testid="tire-listing-form-negotiable"
          />
        </div>

        <div className="sm:row-start-3 sm:col-span-1">
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
          />
        </div>
      </div>
    </div>
  );
}
