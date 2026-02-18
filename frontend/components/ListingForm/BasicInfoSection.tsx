'use client';

import { Dropdown } from '@/components/common/Dropdown';
import { useTranslation } from '@/hooks/useTranslation';
import { getYearOptions } from '@/lib/options';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';
import { InfoBlock, HintTooltip } from '@/ui';

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
}: ListingFormSectionProps) {
  const { t } = useTranslation();
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);

  return (
    <div className="mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.basicInfo')}
      </h2>
      <InfoBlock className="mb-5">
        <p>
          {t('listings.brandModelInfo')
            .split('support@kupito.club')
            .map((part, index, array) => (
              <span key={index}>
                {part}
                {index < array.length - 1 && (
                  <strong className="font-bold text-primary-900">{siteConfig.supportEmail}</strong>
                )}
              </span>
            ))}
        </p>
      </InfoBlock>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-700">
            {t('listings.brandLabel')}
            <RequiredAsterisk filled={!!formData.vehicle.brand_id} />
          </label>
          <Dropdown
            value={formData.vehicle.brand_id}
            onChange={(value) => {
              clearError('vehicle.brand_id');
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, brand_id: value },
              }));
            }}
            searchable={true}
            placeholder={t('listings.selectBrand')}
            error={!!errors['vehicle.brand_id']}
            options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
          />
          {errors['vehicle.brand_id'] && (
            <p className="mt-1 text-sm text-red-500">{t('listings.brandRequired')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-700">
            {t('listings.modelLabel')}
            <RequiredAsterisk filled={!!formData.vehicle.model_id} />
          </label>
          <Dropdown
            value={formData.vehicle.model_id}
            onChange={(value) => {
              clearError('vehicle.model_id');
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, model_id: value },
              }));
            }}
            disabled={!formData.vehicle.brand_id || loadingModels}
            searchable={true}
            placeholder={loadingModels ? t('common.loading') : t('listings.selectModel')}
            error={!!errors['vehicle.model_id']}
            options={models.map((model) => ({ value: model.id, label: model.name }))}
          />
          {errors['vehicle.model_id'] && (
            <p className="mt-1 text-sm text-red-500">{t('listings.modelRequired')}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-700">
            {t('listings.yearLabel')}
            <RequiredAsterisk filled={!!formData.vehicle.year} />
          </label>
          <Dropdown
            value={formData.vehicle.year}
            onChange={(value) => {
              clearError('vehicle.year');
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, year: value },
              }));
            }}
            searchable={true}
            placeholder={t('searchFilters.selectYear')}
            error={!!errors['vehicle.year']}
            options={getYearOptions()}
          />
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <label htmlFor="vin-input" className="text-sm font-semibold text-primary-700">
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
