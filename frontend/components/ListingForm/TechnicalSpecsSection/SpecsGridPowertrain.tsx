'use client';

import { FuelIcon } from '@/components/search/search-filters/search-filter-field-icons';
import { getFuelOptions } from '@/lib/options';
import { horsepowerToKw, kwToHorsepower } from '@/lib/utils';

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
        <label className="mb-2 hidden items-center gap-2 text-sm font-semibold text-primary-900 md:flex">
          <FuelIcon />
          {t('listings.fuelLabel')}
          <RequiredAsterisk filled={!!formData.vehicle.fuel} />
        </label>
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
        <label className="block text-sm font-semibold mb-2 text-primary-900 whitespace-nowrap">
          {t('listings.engineDisplacementLabel')}
          {!isElectric && <RequiredAsterisk filled={!!formData.vehicle.engine_displ_l.trim()} />}
        </label>
        <input
          type="text"
          inputMode="decimal"
          required={!isElectric}
          step="0.1"
          min="0"
          max="99"
          value={formData.vehicle.engine_displ_l}
          disabled={isElectric}
          data-testid="listing-form-engine-displacement"
          onChange={(e) => {
            clearError('vehicle.engine_displ_l');
            let value = e.target.value.replace(',', '.');
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
          onBlur={(e) => {
            const inputValue = e.target.value.trim();
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
          className={`input-field h-[48px] ${errors['vehicle.engine_displ_l'] ? 'border-red-500 focus:border-red-500 ' : ''}`}
          placeholder={isElectric ? '—' : t('listings.engineDisplacementPlaceholder')}
          title={t('listings.engineDisplacementTitle')}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-primary-900 whitespace-nowrap">
          {t('listings.powerHorsepowerLabel')}
          <RequiredAsterisk filled={!!formData.horsepower.trim()} />
        </label>
        <input
          type="text"
          inputMode="numeric"
          required
          min="1"
          max="9999"
          value={formData.horsepower}
          data-testid="listing-form-horsepower"
          onChange={(e) => {
            clearError('horsepower');
            clearError('power_kw');
            const value = e.target.value.replace(/[^0-9]/g, '');
            if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 9999)) {
              const hpValue = value === '' ? 0 : parseInt(value);
              const kwValue = hpValue > 0 ? horsepowerToKw(hpValue) : '';
              setFormData((prev) => ({
                ...prev,
                horsepower: value,
                power_kw: kwValue.toString(),
              }));
            }
          }}
          onWheel={handleWheel}
          className={`input-field h-[48px] ${errors['horsepower'] ? 'border-red-500 focus:border-red-500 ' : ''}`}
          placeholder={t('listings.powerPlaceholder')}
          title={t('listings.powerHorsepowerTitle')}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-primary-900 whitespace-nowrap">
          {t('listings.powerKwLabel')}
          <RequiredAsterisk filled={!!formData.power_kw.trim()} />
        </label>
        <input
          type="text"
          inputMode="numeric"
          required
          min="1"
          max="9999"
          value={formData.power_kw}
          data-testid="listing-form-power-kw"
          onChange={(e) => {
            clearError('power_kw');
            clearError('horsepower');
            const value = e.target.value.replace(/[^0-9]/g, '');
            if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 9999)) {
              const kwValue = value === '' ? 0 : parseInt(value);
              const hpValue = kwValue > 0 ? kwToHorsepower(kwValue) : '';
              setFormData((prev) => ({
                ...prev,
                power_kw: value,
                horsepower: hpValue.toString(),
              }));
            }
          }}
          onWheel={handleWheel}
          className={`input-field h-[48px] ${errors['power_kw'] ? 'border-red-500 focus:border-red-500 ' : ''}`}
          placeholder={t('listings.torquePlaceholder')}
          title={t('listings.powerKwTitle')}
        />
      </div>
    </>
  );
}
