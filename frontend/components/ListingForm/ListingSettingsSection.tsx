'use client';

import { Dropdown } from '@/components/Dropdown';

import type { ListingFormSectionProps } from './types';

interface ListingSettingsSectionProps extends ListingFormSectionProps {
  mode: 'create' | 'edit';
}

export function ListingSettingsSection({
  formData,
  setFormData,
  t,
  mode,
}: ListingSettingsSectionProps) {
  if (mode !== 'create') {
    return null;
  }

  return (
    <div className="border-t border-primary-500/20 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
        {t('listings.listingSettings')}
      </h2>
      <div>
        <label className="block text-sm font-semibold mb-2 text-primary-400">
          {t('listings.statusLabel')}
        </label>
        <Dropdown
          value={formData.status}
          onChange={(value) =>
            setFormData((prev) => ({ ...prev, status: value as 'Active' | 'Paused' }))
          }
          placeholder={t('listings.statusLabel')}
          options={[
            { value: 'Active', label: t('listings.publishedStatus') },
            { value: 'Paused', label: t('listings.pausedStatus') },
          ]}
        />
      </div>
    </div>
  );
}
