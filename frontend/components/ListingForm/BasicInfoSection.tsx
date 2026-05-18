'use client';

import { useMemo } from 'react';

import { SearchFilterYearIcon } from '@/components/search/search-filters/search-filter-field-icons';
import { useTranslation } from '@/hooks/useTranslation';
import { vehicleBrandLogoUrl } from '@/lib/brand-logo-urls';
import { getPopularBrands } from '@/lib/content/popular-brands';
import { getYearOptions } from '@/lib/options';
import { sortByName } from '@/lib/utils';
import { HintTooltip } from '@/ui';

import { BrandModelCatalogInfoBlock } from './BrandModelCatalogInfoBlock';
import { ListingYearField } from './ListingYearField';
import { MobileSelectField } from './MobileSelectField';
import { RequiredAsterisk } from './RequiredAsterisk';
import type { ListingFormSectionProps } from './types';

export function BasicInfoSection({
  formData,
  setFormData,
  errors,
  clearError,
  brands = [],
  models = [],
  loadingModels = false,
  vehicleType = 'car',
}: ListingFormSectionProps) {
  const { t } = useTranslation();

  const brandOptions = useMemo(() => {
    const popularNames = getPopularBrands(vehicleType);
    const popularBrands = sortByName(brands.filter((brand) => popularNames.includes(brand.name)));
    const otherBrands = sortByName(brands.filter((brand) => !popularNames.includes(brand.name)));
    const options: Array<{ value: string; label: string; category?: string; logoSrc?: string }> =
      [];
    if (popularBrands.length > 0) {
      const popularLabel = t('searchFilters.popular');
      options.push({ value: '__category__popular', label: popularLabel, category: popularLabel });
      popularBrands.forEach((brand) => {
        options.push({
          value: brand.id,
          label: brand.name,
          category: popularLabel,
          logoSrc: vehicleBrandLogoUrl(brand.name),
        });
      });
    }
    if (otherBrands.length > 0) {
      const otherLabel = t('searchFilters.other');
      options.push({ value: '__category__other', label: otherLabel, category: otherLabel });
      otherBrands.forEach((brand) => {
        options.push({ value: brand.id, label: brand.name, category: otherLabel });
      });
    }
    return options;
  }, [brands, vehicleType, t]);

  const yearOptions = useMemo(() => getYearOptions(), []);

  return (
    <div className="mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.basicInfo')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="mb-2 hidden text-sm font-semibold text-primary-900 md:block">
            {t('listings.brandLabel')}
            <RequiredAsterisk filled={!!formData.vehicle.brand_id} />
          </label>
          <MobileSelectField
            value={formData.vehicle.brand_id}
            onChange={(value) => {
              clearError('vehicle.brand_id');
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, brand_id: value },
              }));
            }}
            sheetTitle={t('listings.brandLabel')}
            requiredAsteriskFilled={!!formData.vehicle.brand_id}
            searchable={true}
            placeholder={t('listings.selectBrand')}
            error={!!errors['vehicle.brand_id']}
            autoPosition={true}
            menuMaxHeight={300}
            options={brandOptions}
            dataTestId="listing-create-brand-select"
          />
          {errors['vehicle.brand_id'] && (
            <p className="mt-1 text-sm text-red-500">{t('listings.brandRequired')}</p>
          )}
        </div>

        <div>
          <label className="mb-2 hidden text-sm font-semibold text-primary-900 md:block">
            {t('listings.modelLabel')}
            <RequiredAsterisk filled={!!formData.vehicle.model_id} />
          </label>
          <MobileSelectField
            value={formData.vehicle.model_id}
            onChange={(value) => {
              clearError('vehicle.model_id');
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, model_id: value },
              }));
            }}
            sheetTitle={t('listings.modelLabel')}
            requiredAsteriskFilled={!!formData.vehicle.model_id}
            disabled={!formData.vehicle.brand_id || loadingModels}
            searchable={true}
            placeholder={loadingModels ? t('common.loading') : t('listings.selectModel')}
            error={!!errors['vehicle.model_id']}
            autoPosition={true}
            menuMaxHeight={300}
            options={models.map((model) => ({ value: model.id, label: model.name }))}
            dataTestId="listing-create-model-select"
          />
          {errors['vehicle.model_id'] && (
            <p className="mt-1 text-sm text-red-500">{t('listings.modelRequired')}</p>
          )}
        </div>
      </div>
      <BrandModelCatalogInfoBlock />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="mb-2 hidden items-center gap-2 text-sm font-semibold text-primary-900 md:flex">
            <SearchFilterYearIcon />
            {t('listings.yearLabel')}
            <RequiredAsterisk filled={!!formData.vehicle.year} />
          </label>
          <ListingYearField
            value={formData.vehicle.year}
            onChange={(v) => {
              clearError('vehicle.year');
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, year: v },
              }));
            }}
            sheetTitle={t('listings.yearLabel')}
            leadingIcon={<SearchFilterYearIcon />}
            requiredAsteriskFilled={!!formData.vehicle.year}
            placeholder={t('searchFilters.selectYear')}
            error={!!errors['vehicle.year']}
            autoPosition={true}
            menuMaxHeight={300}
            options={yearOptions}
            dataTestId="listing-create-year-select"
          />
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <label htmlFor="vin-input" className="text-sm font-semibold text-primary-900">
              {t('listings.vinLabel')}
            </label>
            <HintTooltip ariaLabel={t('listings.vinHintButton')}>
              {t('listings.vinHint')}
            </HintTooltip>
          </div>
          <input
            id="vin-input"
            type="text"
            maxLength={17}
            value={formData.vin}
            onChange={(e) => {
              clearError('vin');
              const value = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
              setFormData((prev) => ({ ...prev, vin: value }));
            }}
            className={`input-field h-[48px] ${errors['vin'] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
            placeholder={t('listings.vinPlaceholder')}
            title={t('listings.vinTitle')}
            data-testid="listing-create-vin-input"
          />
          {formData.vin && formData.vin.length > 0 && formData.vin.length < 17 && (
            <p className="mt-1 text-sm text-gray-400">
              {t('listings.remainingCharacters', { count: 17 - formData.vin.length })}
            </p>
          )}
          {formData.vin && formData.vin.length === 17 && (
            <p className="mt-1 text-sm text-primary-700">{t('listings.vinValid')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
