'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';

import type { TireListingFormData } from '@/components/ListingForm/tireListingFormTypes';
import { Checkbox } from '@/ui';

type SetTireForm = Dispatch<SetStateAction<TireListingFormData>>;
type TFn = (_key: string, _params?: Record<string, string | number>) => string;

export function TireFormOptionsSection({
  formData,
  setFormData,
  t,
}: {
  formData: TireListingFormData;
  setFormData: SetTireForm;
  t: TFn;
}) {
  const tireOptionNodes: ReactNode[] = [];
  if (formData.season === 'winter') {
    tireOptionNodes.push(
      <Checkbox
        key="studded"
        id="tire-studded"
        size="md"
        checked={formData.studded}
        onChange={(checked) => setFormData((prev) => ({ ...prev, studded: checked }))}
        label={t('searchFilters.tireStudded')}
      />,
    );
  }
  if (formData.tire_vehicle_type === 'car') {
    tireOptionNodes.push(
      <Checkbox
        key="run_flat"
        id="tire-run-flat"
        size="md"
        checked={formData.run_flat}
        onChange={(checked) => setFormData((prev) => ({ ...prev, run_flat: checked }))}
        label={t('searchFilters.tireRunFlat')}
      />,
    );
  }
  tireOptionNodes.push(
    <Checkbox
      key="reinforced"
      id="tire-reinforced"
      size="md"
      checked={formData.reinforced_xl}
      onChange={(checked) => setFormData((prev) => ({ ...prev, reinforced_xl: checked }))}
      label={t('searchFilters.tireReinforcedXl')}
    />,
    <Checkbox
      key="spare_donut"
      id="tire-spare-donut"
      size="md"
      checked={formData.spare_donut}
      onChange={(checked) => setFormData((prev) => ({ ...prev, spare_donut: checked }))}
      label={t('searchFilters.tireSpareDonut')}
    />,
    <Checkbox
      key="tubeless"
      id="tire-tubeless"
      size="md"
      checked={formData.tubeless}
      onChange={(checked) => setFormData((prev) => ({ ...prev, tubeless: checked }))}
      label={t('searchFilters.tireTubeless')}
    />,
    <Checkbox
      key="acoustic"
      id="tire-acoustic"
      size="md"
      checked={formData.acoustic}
      onChange={(checked) => setFormData((prev) => ({ ...prev, acoustic: checked }))}
      label={t('searchFilters.tireAcoustic')}
    />,
  );
  const tireOptionMid = Math.ceil(tireOptionNodes.length / 2);

  return (
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.tireForm.tireOptions')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-3">{tireOptionNodes.slice(0, tireOptionMid)}</div>
        <div className="space-y-3">{tireOptionNodes.slice(tireOptionMid)}</div>
      </div>
    </div>
  );
}
