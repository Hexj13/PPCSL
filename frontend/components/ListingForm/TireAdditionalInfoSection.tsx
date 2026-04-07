'use client';

import { DescriptionFieldWithLanguageTabs } from '@/components/ListingForm/DescriptionFieldWithLanguageTabs';

import type { TireListingFormData } from './tireListingFormTypes';

const FIRE_EMOJI = '🔥';

interface TireAdditionalInfoSectionProps {
  formData: TireListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<TireListingFormData>>;
  t: (_key: string, _params?: Record<string, string | number>) => string;
}

export function TireAdditionalInfoSection({
  formData,
  setFormData,
  t,
}: TireAdditionalInfoSectionProps) {
  return (
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.additionalInfo')}
      </h2>
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3 text-primary-700">{t('listings.labels')}</h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                id="tire-listing-urgent"
                type="checkbox"
                checked={formData.urgent}
                data-testid="tire-listing-form-urgent"
                onChange={(e) => setFormData((prev) => ({ ...prev, urgent: e.target.checked }))}
                className="sr-only"
              />
              <label
                htmlFor="tire-listing-urgent"
                className={`w-6 h-6 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                  formData.urgent
                    ? 'border-primary-700 bg-primary-500/10'
                    : 'border-primary-700/50 bg-bg-secondary hover-only:hover:border-primary-700'
                }`}
              >
                {formData.urgent && (
                  <svg
                    className="w-4 h-4 text-primary-900"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </label>
            </div>
            <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-accentSecondary text-text-secondary whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-accentSecondary/10 before:pointer-events-none">
              <span
                className="relative z-10 shrink-0 text-text-secondary"
                style={{ filter: 'grayscale(1) brightness(0.5)' }}
              >
                {FIRE_EMOJI}
              </span>
              <span className="relative z-10">{t('listings.urgent')}</span>
            </span>
          </div>
        </div>
      </div>

      <DescriptionFieldWithLanguageTabs
        descriptionRo={formData.description_ro}
        descriptionRu={formData.description_ru}
        onRoChange={(value) => setFormData((prev) => ({ ...prev, description_ro: value }))}
        onRuChange={(value) => setFormData((prev) => ({ ...prev, description_ru: value }))}
        placeholder={t('listings.tireForm.descriptionPlaceholder')}
        editorTestId="tire-listing-form-description-editor"
      />
    </div>
  );
}
