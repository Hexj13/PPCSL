'use client';

import { useEffect, useState, type Dispatch, type SetStateAction, type WheelEvent } from 'react';

import { ListingFormTextInput } from '@/components/ListingForm/ListingFormTextInput';
import { MobileSelectField } from '@/components/ListingForm/MobileSelectField';
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

function useIsMdUp(): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = () => setMatches(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return matches;
}

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
  const isMdUp = useIsMdUp();
  const sizeAsterisk = (
    <RequiredAsterisk
      filled={
        !!formData.width_mm.trim() &&
        !!formData.aspect_ratio.trim() &&
        !!formData.diameter_inch.trim()
      }
    />
  );

  return (
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.tireForm.sizeAndTechnical')}
      </h2>
      <div className="mb-4 min-w-0 flex flex-col gap-4 sm:flex-row sm:gap-4">
        <div className="w-full min-w-0 sm:flex-1 sm:basis-0">
          {!isMdUp ? (
            <label className="mb-2 block text-sm font-semibold text-primary-900">
              {t('searchFilters.tireSizeCriteria')}
              {sizeAsterisk}
            </label>
          ) : null}
          <div className="flex w-full min-w-0 overflow-x-auto">
            <ListingFormTextInput
              value={formData.width_mm}
              onChange={(raw) => {
                clearError('width_mm');
                const digits = raw.replace(/\D/g, '').slice(0, TIRE_WIDTH_MM_INPUT_MAX_LEN);
                setFormData((prev) => ({
                  ...prev,
                  width_mm: digits,
                }));
              }}
              onWheel={handleWheel}
              fieldLabel={t('searchFilters.tireWidth')}
              fieldLabelTrailing={sizeAsterisk}
              paired="left"
              inputMode="numeric"
              maxLength={TIRE_WIDTH_MM_INPUT_MAX_LEN}
              title={t('listings.tireForm.widthMmTitle', {
                min: TIRE_WIDTH_MM_MIN,
                max: TIRE_WIDTH_MM_MAX,
                step: TIRE_WIDTH_MM_STEP,
              })}
              placeholder="205"
              error={!!errors['width_mm']}
              className="flex-1 min-w-[3.5rem]"
              mobileClassName="flex-1 min-w-[3.5rem]"
            />
            <ListingFormTextInput
              value={formData.aspect_ratio}
              onChange={(raw) => {
                clearError('aspect_ratio');
                const digits = raw.replace(/\D/g, '').slice(0, TIRE_ASPECT_RATIO_INPUT_MAX_LEN);
                setFormData((prev) => ({
                  ...prev,
                  aspect_ratio: digits,
                }));
              }}
              onWheel={handleWheel}
              fieldLabel={t('searchFilters.tireProfile')}
              paired="middle"
              inputMode="numeric"
              maxLength={TIRE_ASPECT_RATIO_INPUT_MAX_LEN}
              title={t('listings.tireForm.aspectRatioTitle', {
                min: TIRE_ASPECT_RATIO_MIN,
                max: TIRE_ASPECT_RATIO_MAX,
                step: TIRE_ASPECT_RATIO_STEP,
              })}
              placeholder="55"
              error={!!errors['aspect_ratio']}
              className="flex-1 min-w-[3rem]"
              mobileClassName="flex-1 min-w-[3rem]"
            />
            <ListingFormTextInput
              value={formData.diameter_inch}
              onChange={(raw) => {
                clearError('diameter_inch');
                const value = raw.replace(',', '.');
                if (value === '' || /^\d{1,2}(\.\d{0,1})?$/.test(value)) {
                  setFormData((prev) => ({ ...prev, diameter_inch: value }));
                }
              }}
              onWheel={handleWheel}
              fieldLabel={t('searchFilters.tireDiameter')}
              paired="right"
              inputMode="decimal"
              title={t('listings.tireForm.diameterInchTitle', {
                min: TIRE_DIAMETER_INCH_MIN,
                max: TIRE_DIAMETER_INCH_MAX,
                step: TIRE_DIAMETER_INCH_STEP,
              })}
              placeholder="16"
              error={!!errors['diameter_inch']}
              className="flex-1 min-w-[3rem]"
              mobileClassName="flex-1 min-w-[3rem]"
            />
          </div>
        </div>
        <div className="w-full min-w-0 sm:flex-1 sm:basis-0">
          <div className="mb-2 md:hidden">
            <HintTooltip ariaLabel={t('listings.tireForm.quantityHintAria')} width="w-96">
              {t('listings.tireForm.quantityHint')}
            </HintTooltip>
          </div>
          <MobileSelectField
            value={formData.quantity}
            onChange={(value) => {
              clearError('quantity');
              setFormData((prev) => ({ ...prev, quantity: value }));
            }}
            sheetTitle={t('listings.tireForm.quantityLabel')}
            requiredAsteriskFilled={!!formData.quantity}
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
          <div className="mb-2 flex items-center gap-1.5 md:hidden">
            <label className="text-sm font-semibold text-primary-900">
              {t('listings.tireForm.loadIndex')}
            </label>
            <HintTooltip
              ariaLabel={t('listings.tireForm.loadIndexHintAria')}
              width="w-96"
              contentHtml={t('listings.tireForm.loadIndexHint')}
            />
          </div>
          <ListingFormTextInput
            value={formData.load_index}
            onChange={(raw) => {
              clearError('load_index');
              const digits = raw.replace(/\D/g, '').slice(0, 3);
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
            fieldLabel={t('listings.tireForm.loadIndex')}
            inputMode="numeric"
            title={t('listings.tireForm.loadIndexInputTitle', {
              min: TIRE_LOAD_INDEX_MIN,
              max: TIRE_LOAD_INDEX_MAX,
            })}
            error={!!errors['load_index']}
          />
        </div>
        <div>
          <div className="mb-2 md:hidden">
            <HintTooltip
              ariaLabel={t('listings.tireForm.speedIndexHintAria')}
              width="w-96"
              contentHtml={t('listings.tireForm.speedIndexHint')}
            />
          </div>
          <MobileSelectField
            value={formData.speed_index}
            onChange={(value) => setFormData((prev) => ({ ...prev, speed_index: value }))}
            sheetTitle={t('listings.tireForm.speedIndex')}
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
