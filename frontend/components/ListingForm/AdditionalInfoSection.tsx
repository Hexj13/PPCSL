'use client';

import { RichTextEditor } from '@/components/RichTextEditor';

import type { ListingFormSectionProps } from './types';

export function AdditionalInfoSection({ formData, setFormData, t }: ListingFormSectionProps) {
  return (
    <div className="border-t border-primary-500/20 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
        {t('listings.additionalInfo')}
      </h2>
      <div className="flex items-center gap-6 mb-6">
        <div className="flex items-center gap-3 group">
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
              className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                formData.urgent
                  ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                  : 'border-primary-500/50 bg-bg-secondary group-hover:border-primary-500'
              }`}
            >
              {formData.urgent && (
                <svg
                  className="w-3 h-3 text-white"
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
          <span
            className={`text-sm transition-colors duration-200 flex items-center gap-2 ${
              formData.urgent ? 'text-primary-400' : 'text-gray-400 group-hover:text-gray-300'
            }`}
          >
            <span>🔥</span>
            <span>{t('listings.urgent')}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 group">
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
              className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                formData.is_new
                  ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                  : 'border-primary-500/50 bg-bg-secondary group-hover:border-primary-500'
              }`}
            >
              {formData.is_new && (
                <svg
                  className="w-3 h-3 text-white"
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
          <span
            className={`text-sm transition-colors duration-200 flex items-center gap-2 ${
              formData.is_new ? 'text-primary-400' : 'text-gray-400 group-hover:text-gray-300'
            }`}
          >
            {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
            <span>✨</span>
            <span>{t('listings.new')}</span>
          </span>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2 text-primary-400">
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
