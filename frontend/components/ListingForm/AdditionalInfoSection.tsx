'use client';

import { RichTextEditor } from '@/components/common/RichTextEditor';

import type { ListingFormSectionProps } from './types';

const FIRE_EMOJI = '🔥';
const SPARKLES_EMOJI = '\u2728';

export function AdditionalInfoSection({
  formData,
  setFormData,
  t,
  vehicleType,
}: ListingFormSectionProps) {
  const newLabel = vehicleType === 'moto' ? t('listings.newMoto') : t('listings.new');

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
                type="checkbox"
                checked={formData.urgent}
                onChange={(e) => setFormData((prev) => ({ ...prev, urgent: e.target.checked }))}
                className="sr-only"
              />
              <div
                onClick={(e) => {
                  e.preventDefault();
                  setFormData((prev) => ({ ...prev, urgent: !prev.urgent }));
                }}
                className={`w-6 h-6 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                  formData.urgent
                    ? 'border-primary-700 bg-primary-500/10'
                    : 'border-primary-700/50 bg-bg-secondary hover:border-primary-700'
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
              </div>
            </div>
            <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-accentSecondary text-text-secondary whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-accentSecondary/10 before:pointer-events-none">
              <span
                className="relative z-10 flex-shrink-0 text-text-secondary"
                style={{ filter: 'grayscale(1) brightness(0.5)' }}
              >
                {FIRE_EMOJI}
              </span>
              <span className="relative z-10">{t('listings.urgent')}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.is_new}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_new: e.target.checked }))}
                className="sr-only"
              />
              <div
                onClick={(e) => {
                  e.preventDefault();
                  setFormData((prev) => ({ ...prev, is_new: !prev.is_new }));
                }}
                className={`w-6 h-6 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                  formData.is_new
                    ? 'border-primary-700 bg-primary-500/10'
                    : 'border-primary-700/50 bg-bg-secondary hover:border-primary-700'
                }`}
              >
                {formData.is_new && (
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
              </div>
            </div>
            <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-newBadge text-text-secondary whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-newBadge/10 before:pointer-events-none">
              <span
                className="relative z-10 flex-shrink-0 text-text-secondary"
                style={{ filter: 'grayscale(1) brightness(0.5)' }}
              >
                {SPARKLES_EMOJI}
              </span>
              <span className="relative z-10">{newLabel}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2 text-primary-700">
          {t('listings.descriptionLabel')}
        </label>
        <RichTextEditor
          value={formData.description}
          onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
          placeholder={t('listings.descriptionPlaceholder')}
          maxLength={5000}
          rows={4}
        />
      </div>
    </div>
  );
}
