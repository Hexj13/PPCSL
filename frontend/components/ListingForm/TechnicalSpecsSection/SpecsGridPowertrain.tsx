'use client';

import { FuelIcon } from '@/components/search/search-filters/search-filter-field-icons';
import { getFuelOptions } from '@/lib/options';
import { horsepowerToKw, kwToHorsepower } from '@/lib/utils';

import { ListingFormTextInput } from '../ListingFormTextInput';
import { MobileSelectField } from '../MobileSelectField';
import { RequiredAsterisk } from '../RequiredAsterisk';
import type { ListingFormSectionProps } from '../types';

type SpecsGridPowertrainProps = ListingFormSectionProps & {
  isElectric: boolean;
};

export function SpecsGridPowertrain({
  formData,
  setFormData,
  errors,
  clearError,
  t,
  vehicleType = 'car',
  handleWheel,
  isElectric,
}: SpecsGridPowertrainProps) {
  return (
    <>
      <div>
        <MobileSelectField
          value={formData.vehicle.fuel}
          onChange={(value) => {
            clearError('vehicle.fuel');
            if (value === 'Electric') clearError('vehicle.engine_displ_l');
            setFormData((prev) => ({
              ...prev,
              vehicle: {
                ...prev.vehicle,
                fuel: value,
                ...(value === 'Electric' ? { engine_displ_l: '' } : {}),
              },
            }));
          }}
          sheetTitle={t('listings.fuelLabel')}
          leadingIcon={<FuelIcon />}
          requiredAsteriskFilled={!!formData.vehicle.fuel}
          placeholder={t('searchFilters.selectFuel')}
          error={!!errors['vehicle.fuel']}
          autoPosition={true}
          menuMaxHeight={300}
          options={getFuelOptions(t)}
          dataTestId="listing-create-fuel-select"
        />
      </div>

      <div>
        <label className="mb-2 block whitespace-nowrap text-sm font-semibold text-primary-900 md:hidden">
          {t('listings.engineDisplacementLabel')}
          {!isElectric && <RequiredAsterisk filled={!!formData.vehicle.engine_displ_l.trim()} />}
        </label>
        <ListingFormTextInput
          value={formData.vehicle.engine_displ_l}
          onChange={(raw) => {
            clearError('vehicle.engine_displ_l');
            let value = raw.replace(',', '.');
            value = value.replace(/[^0-9.]/g, '');
            const parts = value.split('.');
            if (parts.length > 2) {
              value = parts[0] + '.' + parts.slice(1).join('');
            }
            const maxDecimals = vehicleType === 'moto' ? 3 : 1;
            if (parts.length === 2 && parts[1].length > maxDecimals) {
              value = parts[0] + '.' + parts[1].substring(0, maxDecimals);
            }
            if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 99)) {
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, engine_displ_l: value },
              }));
            }
          }}
          onBlur={(raw) => {
            const inputValue = raw.trim();
            if (!inputValue) return;
            const numValue = parseFloat(inputValue);
            if (isNaN(numValue)) return;
            if (numValue < 0) {
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, engine_displ_l: '0' },
              }));
            } else if (numValue > 99) {
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, engine_displ_l: '99' },
              }));
            }
          }}
          fieldLabel={t('listings.engineDisplacementLabel')}
          fieldLabelTrailing={
            !isElectric ? (
              <RequiredAsterisk filled={!!formData.vehicle.engine_displ_l.trim()} />
            ) : undefined
          }
          inputMode="decimal"
          disabled={isElectric}
          title={t('listings.engineDisplacementTitle')}
          placeholder={isElectric ? '—' : t('listings.engineDisplacementPlaceholder')}
          error={!!errors['vehicle.engine_displ_l']}
          dataTestId="listing-form-engine-displacement"
        />
      </div>

      <div>
        <label className="mb-2 block whitespace-nowrap text-sm font-semibold text-primary-900 md:hidden">
          {t('listings.powerHorsepowerLabel')}
          <RequiredAsterisk filled={!!formData.horsepower.trim()} />
        </label>
        <ListingFormTextInput
          value={formData.horsepower}
          onChange={(raw) => {
            clearError('horsepower');
            clearError('power_kw');
            const value = raw.replace(/[^0-9]/g, '');
            if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 9999)) {
              const hpValue = value === '' ? 0 : parseInt(value, 10);
              const kwValue = hpValue > 0 ? horsepowerToKw(hpValue) : '';
              setFormData((prev) => ({
                ...prev,
                horsepower: value,
                power_kw: kwValue.toString(),
              }));
            }
          }}
          onWheel={handleWheel}
          fieldLabel={t('listings.powerHorsepowerLabel')}
          fieldLabelTrailing={<RequiredAsterisk filled={!!formData.horsepower.trim()} />}
          inputMode="numeric"
          title={t('listings.powerHorsepowerTitle')}
          placeholder={t('listings.powerPlaceholder')}
          error={!!errors['horsepower']}
          dataTestId="listing-form-horsepower"
        />
      </div>

      <div>
        <label className="mb-2 block whitespace-nowrap text-sm font-semibold text-primary-900 md:hidden">
          {t('listings.powerKwLabel')}
          <RequiredAsterisk filled={!!formData.power_kw.trim()} />
        </label>
        <ListingFormTextInput
          value={formData.power_kw}
          onChange={(raw) => {
            clearError('power_kw');
            clearError('horsepower');
            const value = raw.replace(/[^0-9]/g, '');
            if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 9999)) {
              const kwValue = value === '' ? 0 : parseInt(value, 10);
              const hpValue = kwValue > 0 ? kwToHorsepower(kwValue) : '';
              setFormData((prev) => ({
                ...prev,
                power_kw: value,
                horsepower: hpValue.toString(),
              }));
            }
          }}
          onWheel={handleWheel}
          fieldLabel={t('listings.powerKwLabel')}
          fieldLabelTrailing={<RequiredAsterisk filled={!!formData.power_kw.trim()} />}
          inputMode="numeric"
          title={t('listings.powerKwTitle')}
          placeholder={t('listings.torquePlaceholder')}
          error={!!errors['power_kw']}
          dataTestId="listing-form-power-kw"
        />
      </div>
    </>
  );
}
