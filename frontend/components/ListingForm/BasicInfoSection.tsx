'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

import { Dropdown } from '@/components/Dropdown';
import { useTranslation } from '@/hooks/useTranslation';

import { ListingFormSectionProps } from './types';

export function BasicInfoSection({
  formData,
  setFormData,
  errors,
  clearError,
  brands = [],
  models = [],
  loadingModels = false,
  showVinHint: showVinHintProp,
  setShowVinHint: setShowVinHintProp,
  handleWheel,
  onFormFieldFocus,
}: ListingFormSectionProps) {
  const { t } = useTranslation();
  const [showVinHintLocal, setShowVinHintLocal] = useState(false);
  const showVinHint = showVinHintProp !== undefined ? showVinHintProp : showVinHintLocal;
  const setShowVinHint = setShowVinHintProp || setShowVinHintLocal;

  return (
    <div className="mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
        {t('listings.basicInfo')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            {t('listings.brandLabel')}
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
            options={[
              { value: '', label: t('listings.selectBrand') },
              ...brands.map((brand) => ({ value: brand.id, label: brand.name })),
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            {t('listings.modelLabel')}
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
            options={[
              { value: '', label: t('listings.selectModel') },
              ...models.map((model) => ({ value: model.id, label: model.name })),
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            {t('listings.yearLabel')}
          </label>
          <input
            type="text"
            required
            value={formData.vehicle.year}
            onFocus={onFormFieldFocus}
            onChange={(e) => {
              clearError('vehicle.year');
              const value = e.target.value.replace(/[^0-9]/g, '');
              if (value.length <= 4) {
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, year: value },
                }));
              }
            }}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value) {
                const year = parseInt(value, 10);
                const currentYear = new Date().getFullYear();
                const maxYear = currentYear + 1;

                if (isNaN(year) || year < 1900 || year > maxYear) {
                  toast.error(t('listings.yearRangeErrorForm', { maxYear: maxYear.toString() }));
                  setFormData((prev) => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, year: '' },
                  }));
                }
              }
            }}
            onWheel={handleWheel}
            className={`input-field h-[48px] ${errors['vehicle.year'] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
            placeholder="2020"
            title={t('listings.yearTitle')}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center justify-between">
            <span>{t('listings.vinLabel')}</span>
            <div className="relative group">
              <button
                type="button"
                onClick={() => setShowVinHint(!showVinHint)}
                className="focus:outline-none"
              >
                <svg
                  className="w-4 h-4 text-primary-400 hover:text-primary-300 cursor-help transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              <div
                className={`absolute right-0 bottom-full mb-2 ${showVinHint ? 'block' : 'hidden group-hover:block'} z-10 w-64`}
              >
                <div className="bg-bg-darker border-2 border-primary-500/50 rounded-lg p-3 shadow-lg">
                  <p className="text-xs text-hint leading-relaxed">{t('listings.vinHint')}</p>
                  <div className="absolute right-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-primary-500/50"></div>
                </div>
              </div>
            </div>
          </label>
          <input
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
            <p className="mt-1 text-sm text-primary-400">{t('listings.vinValid')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
