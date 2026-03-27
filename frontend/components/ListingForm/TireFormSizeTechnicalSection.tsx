'use client';

import { type Dispatch, type SetStateAction, type WheelEvent } from 'react';

import { RequiredAsterisk } from '@/components/ListingForm/RequiredAsterisk';
import {
  TIRE_ASPECT_RATIO_INPUT_MAX_LEN,
  TIRE_LISTING_QUANTITY_OPTS,
  TIRE_LOAD_INDEX_MAX,
  TIRE_LOAD_INDEX_MIN,
  TIRE_SPEED_INDEX_OPTS,
  TIRE_WIDTH_MM_INPUT_MAX_LEN,
} from '@/components/ListingForm/tireListingFormConstants';
import type { TireListingFormData } from '@/components/ListingForm/tireListingFormTypes';
import { Dropdown } from '@/components/common/Dropdown';
import {
  TIRE_ASPECT_RATIO_MAX,
  TIRE_ASPECT_RATIO_MIN,
  TIRE_ASPECT_RATIO_STEP,
  TIRE_DIAMETER_INCH_MAX,
  TIRE_DIAMETER_INCH_MIN,
  TIRE_DIAMETER_INCH_STEP,
  TIRE_WIDTH_MM_MAX,
  TIRE_WIDTH_MM_MIN,
  TIRE_WIDTH_MM_STEP,
} from '@/lib/constants';
import { HintTooltip } from '@/ui';

type SetTireForm = Dispatch<SetStateAction<TireListingFormData>>;
type TFn = (_key: string, _params?: Record<string, string | number>) => string;

export function TireFormSizeTechnicalSection({
  formData,
  setFormData,
  errors,
  clearError,
  handleWheel,
  t,
}: {
  formData: TireListingFormData;
  setFormData: SetTireForm;
  errors: Record<string, boolean>;
  clearError: (_field: string) => void;
  handleWheel: (_e: WheelEvent<HTMLInputElement>) => void;
  t: TFn;
}) {
  return (
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.tireForm.sizeAndTechnical')}
      </h2>
      <div className="mb-4 min-w-0 flex flex-col gap-4 sm:flex-row sm:gap-4">
        <div className="w-full min-w-0 sm:flex-1 sm:basis-0">
          <label className="block text-sm font-semibold mb-2 text-primary-700">
            {t('searchFilters.tireSizeCriteria')}
            <RequiredAsterisk
              filled={
                !!formData.width_mm.trim() &&
                !!formData.aspect_ratio.trim() &&
                !!formData.diameter_inch.trim()
              }
            />
          </label>
          <div className="flex w-full min-w-0 overflow-x-auto">
            <input
              type="text"
              inputMode="numeric"
              maxLength={TIRE_WIDTH_MM_INPUT_MAX_LEN}
              value={formData.width_mm}
              onChange={(e) => {
                clearError('width_mm');
                const digits = e.target.value
                  .replace(/\D/g, '')
                  .slice(0, TIRE_WIDTH_MM_INPUT_MAX_LEN);
                setFormData((prev) => ({
                  ...prev,
                  width_mm: digits,
                }));
              }}
              onWheel={handleWheel}
              className={`input-field paired-left flex-1 min-w-[3.5rem] h-[48px] ${errors['width_mm'] ? 'border-red-500' : ''}`}
              placeholder="205"
              title={t('listings.tireForm.widthMmTitle', {
                min: TIRE_WIDTH_MM_MIN,
                max: TIRE_WIDTH_MM_MAX,
                step: TIRE_WIDTH_MM_STEP,
              })}
            />
            <input
              type="text"
              inputMode="numeric"
              maxLength={TIRE_ASPECT_RATIO_INPUT_MAX_LEN}
              value={formData.aspect_ratio}
              onChange={(e) => {
                clearError('aspect_ratio');
                const digits = e.target.value
                  .replace(/\D/g, '')
                  .slice(0, TIRE_ASPECT_RATIO_INPUT_MAX_LEN);
                setFormData((prev) => ({
                  ...prev,
                  aspect_ratio: digits,
                }));
              }}
              onWheel={handleWheel}
              className={`input-field paired-middle flex-1 min-w-[3rem] h-[48px] ${errors['aspect_ratio'] ? 'border-red-500' : ''}`}
              placeholder="55"
              title={t('listings.tireForm.aspectRatioTitle', {
                min: TIRE_ASPECT_RATIO_MIN,
                max: TIRE_ASPECT_RATIO_MAX,
                step: TIRE_ASPECT_RATIO_STEP,
              })}
            />
            <input
              type="text"
              inputMode="decimal"
              value={formData.diameter_inch}
              onChange={(e) => {
                clearError('diameter_inch');
                const raw = e.target.value.replace(',', '.');
                if (raw === '' || /^\d{1,2}(\.\d{0,1})?$/.test(raw)) {
                  setFormData((prev) => ({ ...prev, diameter_inch: raw }));
                }
              }}
              onWheel={handleWheel}
              className={`input-field paired-right flex-1 min-w-[3rem] h-[48px] ${errors['diameter_inch'] ? 'border-red-500' : ''}`}
              placeholder="16"
              title={t('listings.tireForm.diameterInchTitle', {
                min: TIRE_DIAMETER_INCH_MIN,
                max: TIRE_DIAMETER_INCH_MAX,
                step: TIRE_DIAMETER_INCH_STEP,
              })}
            />
          </div>
        </div>
        <div className="w-full min-w-0 sm:flex-1 sm:basis-0">
          <div className="flex items-center gap-1.5 mb-2">
            <label className="text-sm font-semibold text-primary-700">
              {t('listings.tireForm.quantityLabel')}
              <RequiredAsterisk filled={!!formData.quantity} />
            </label>
            <HintTooltip ariaLabel={t('listings.tireForm.quantityHintAria')} width="w-96">
              {t('listings.tireForm.quantityHint')}
            </HintTooltip>
          </div>
          <Dropdown
            value={formData.quantity}
            onChange={(value) => {
              clearError('quantity');
              setFormData((prev) => ({ ...prev, quantity: value }));
            }}
            autoPosition={true}
            menuMaxHeight={300}
            error={!!errors['quantity']}
            options={TIRE_LISTING_QUANTITY_OPTS.map((q) => ({ value: q, label: q }))}
            className="w-full min-w-0"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <label className="text-sm font-semibold text-primary-700">
              {t('listings.tireForm.loadIndex')}
            </label>
            <HintTooltip
              ariaLabel={t('listings.tireForm.loadIndexHintAria')}
              width="w-96"
              contentHtml={t('listings.tireForm.loadIndexHint')}
            />
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={formData.load_index}
            onChange={(e) => {
              clearError('load_index');
              const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
              let next = digits;
              if (digits !== '') {
                const n = parseInt(digits, 10);
                if (n > TIRE_LOAD_INDEX_MAX) {
                  next = String(TIRE_LOAD_INDEX_MAX);
                }
              }
              setFormData((prev) => ({ ...prev, load_index: next }));
            }}
            onWheel={handleWheel}
            className={`input-field h-[48px] ${errors['load_index'] ? 'border-red-500' : ''}`}
            title={t('listings.tireForm.loadIndexInputTitle', {
              min: TIRE_LOAD_INDEX_MIN,
              max: TIRE_LOAD_INDEX_MAX,
            })}
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <label className="text-sm font-semibold text-primary-700">
              {t('listings.tireForm.speedIndex')}
            </label>
            <HintTooltip
              ariaLabel={t('listings.tireForm.speedIndexHintAria')}
              width="w-96"
              contentHtml={t('listings.tireForm.speedIndexHint')}
            />
          </div>
          <Dropdown
            value={formData.speed_index}
            onChange={(value) => setFormData((prev) => ({ ...prev, speed_index: value }))}
            autoPosition={true}
            menuMaxHeight={300}
            options={[
              { value: '', label: t('listings.tireForm.speedIndexNone') },
              ...TIRE_SPEED_INDEX_OPTS.map((v) => ({ value: v, label: v })),
            ]}
          />
        </div>
      </div>
    </div>
  );
}
