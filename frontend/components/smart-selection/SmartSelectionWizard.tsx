'use client';

import { useMemo, useState } from 'react';

import { clearSavedFiltersCache } from '@/components/search/SavedFiltersList';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import { smartSelectionApi } from '@/lib/api';
import { loadSiteConfigSync } from '@/lib/site-config';
import {
  orderBodyTypes,
  orderDrivingModes,
  orderFuels,
  orderMileagePresets,
  orderPriorities,
  orderPurposes,
  orderSizes,
  orderTransmissions,
  orderYearPresets,
} from '@/lib/smart-selection/option-order';
import {
  INITIAL_SMART_SELECTION_ANSWERS,
  SMART_BUDGET_PRESETS,
  type SmartBodyTypeChoice,
  type SmartFuelChoice,
  type SmartPriority,
  type SmartPurpose,
  type SmartSelectionAnswers,
} from '@/lib/smart-selection/types';
import { toast } from '@/lib/toast';
import { getCountry } from '@/lib/utils';
import { Checkbox, LoadingButton } from '@/ui';

import { SmartSelectionOptionGrid } from './SmartSelectionOptionGrid';

const STEP_COUNT = 6;

const primaryActionButtonClass =
  'close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 py-3 rounded-lg border-2 border-primary-600 bg-primary-500/20 text-primary-800 font-semibold disabled:opacity-50';

function toggleArrayValue<T extends string>(values: T[], value: T, max: number): T[] {
  if (values.includes(value)) {
    return values.filter((v) => v !== value);
  }
  if (values.length >= max) {
    return values;
  }
  return [...values, value];
}

function isStepValid(step: number, answers: SmartSelectionAnswers): boolean {
  switch (step) {
    case 0:
      return answers.purposes.length > 0;
    case 1:
      return answers.drivingMode !== '';
    case 2:
      return answers.budgetPreset !== '';
    case 3:
      return answers.size !== '' && answers.bodyTypes.length > 0;
    case 4:
      return answers.transmission !== '' && answers.fuels.length > 0;
    case 5:
      return (
        answers.yearPreset !== '' && answers.mileagePreset !== '' && answers.priorities.length > 0
      );
    default:
      return false;
  }
}

export function SmartSelectionWizard() {
  const { t } = useTranslation();
  const { push: localizedPush } = useLocalizedNavigation();
  const siteConfig = useMemo(() => loadSiteConfigSync(getCountry()), []);
  const defaultCurrency = siteConfig.currency as 'EUR' | 'MDL';

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SmartSelectionAnswers>(INITIAL_SMART_SELECTION_ANSWERS);
  const [submitting, setSubmitting] = useState(false);

  const wizardContext = useMemo(
    () => ({
      purposes: answers.purposes,
      drivingMode: answers.drivingMode,
      size: answers.size,
      bodyTypes: answers.bodyTypes,
      transmission: answers.transmission,
      fuels: answers.fuels,
      priorities: answers.priorities,
    }),
    [answers],
  );

  const purposeOptions = useMemo(
    () =>
      orderPurposes().map((value) => ({
        value,
        label: t(`smartSelection.purposes.${value}`),
      })),
    [t],
  );
  const drivingOptions = useMemo(
    () =>
      orderDrivingModes(answers.purposes).map((value) => ({
        value,
        label: t(`smartSelection.drivingModes.${value}`),
      })),
    [t, answers.purposes],
  );
  const budgetOptions = useMemo(
    () =>
      SMART_BUDGET_PRESETS.map((value) => ({
        value,
        label: t(`smartSelection.budgetPresets.${value}`, {
          currency: defaultCurrency,
        }),
      })),
    [t, defaultCurrency],
  );
  const sizeOptions = useMemo(
    () =>
      orderSizes(answers.purposes).map((value) => ({
        value,
        label: t(`smartSelection.sizes.${value}`),
      })),
    [t, answers.purposes],
  );
  const bodyTypeOptions = useMemo(
    () =>
      orderBodyTypes(answers.purposes, answers.drivingMode).map((value) => ({
        value,
        label:
          value === 'auto_pick'
            ? t('smartSelection.bodyTypes.auto_pick')
            : t(`vehicleOptions.bodyType.${value}`),
      })),
    [t, answers.purposes, answers.drivingMode],
  );
  const transmissionOptions = useMemo(
    () =>
      orderTransmissions(answers.purposes, answers.drivingMode).map((value) => ({
        value,
        label: t(`smartSelection.transmissions.${value}`),
      })),
    [t, answers.purposes, answers.drivingMode],
  );
  const fuelOptions = useMemo(
    () =>
      orderFuels(wizardContext).map((value) => ({
        value,
        label:
          value === 'any'
            ? t('smartSelection.fuels.any')
            : value === 'auto_pick'
              ? t('smartSelection.fuels.auto_pick')
              : t(`vehicleOptions.fuel.${value}`),
      })),
    [t, wizardContext],
  );
  const yearOptions = useMemo(
    () =>
      orderYearPresets(answers.purposes, answers.priorities).map((value) => ({
        value,
        label: t(`smartSelection.yearPresets.${value}`),
      })),
    [t, answers.purposes, answers.priorities],
  );
  const mileageOptions = useMemo(
    () =>
      orderMileagePresets(answers.purposes, answers.priorities).map((value) => ({
        value,
        label: t(`smartSelection.mileagePresets.${value}`),
      })),
    [t, answers.purposes, answers.priorities],
  );
  const priorityOptions = useMemo(
    () =>
      orderPriorities(answers.purposes, answers.drivingMode).map((value) => ({
        value,
        label: t(`smartSelection.priorities.${value}`),
      })),
    [t, answers.purposes, answers.drivingMode],
  );

  const canGoNext = isStepValid(step, answers);
  const isLastStep = step === STEP_COUNT - 1;

  const handlePurposeSelect = (value: SmartPurpose) => {
    setAnswers((prev) => ({
      ...prev,
      purposes: toggleArrayValue(prev.purposes, value, 3),
    }));
  };

  const handleBodyTypeSelect = (value: SmartBodyTypeChoice) => {
    setAnswers((prev) => {
      if (value === 'auto_pick') {
        return { ...prev, bodyTypes: ['auto_pick'] };
      }
      const withoutAuto = prev.bodyTypes.filter((b) => b !== 'auto_pick');
      const next = toggleArrayValue(withoutAuto, value, 4);
      return { ...prev, bodyTypes: next.length > 0 ? next : ['auto_pick'] };
    });
  };

  const handleFuelSelect = (value: SmartFuelChoice) => {
    setAnswers((prev) => {
      if (value === 'auto_pick' || value === 'any') {
        return { ...prev, fuels: [value] };
      }
      const withoutSpecial = prev.fuels.filter((f) => f !== 'auto_pick' && f !== 'any');
      const next = toggleArrayValue(withoutSpecial, value, 4);
      return { ...prev, fuels: next.length > 0 ? next : ['auto_pick'] };
    });
  };

  const handlePrioritySelect = (value: SmartPriority) => {
    setAnswers((prev) => ({
      ...prev,
      priorities: toggleArrayValue(prev.priorities, value, 3),
    }));
  };

  const handleSubmit = async () => {
    if (!isStepValid(5, answers)) return;

    setSubmitting(true);
    try {
      await smartSelectionApi.createFilter({
        purposes: answers.purposes,
        drivingMode: answers.drivingMode as NonNullable<typeof answers.drivingMode>,
        budgetPreset: answers.budgetPreset as NonNullable<typeof answers.budgetPreset>,
        currency: defaultCurrency,
        flexibleBudget: answers.flexibleBudget,
        size: answers.size as NonNullable<typeof answers.size>,
        bodyTypes: answers.bodyTypes,
        transmission: answers.transmission as NonNullable<typeof answers.transmission>,
        fuels: answers.fuels,
        yearPreset: answers.yearPreset as NonNullable<typeof answers.yearPreset>,
        mileagePreset: answers.mileagePreset as NonNullable<typeof answers.mileagePreset>,
        priorities: answers.priorities,
      });
      clearSavedFiltersCache();
      toast.success(t('smartSelection.submitSuccess'));
      localizedPush('/favorites?tab=filters');
    } catch (error: unknown) {
      const message =
        (error && typeof error === 'object' && 'response' in error
          ? (error.response as { data?: { message?: string } })?.data?.message
          : null) || t('smartSelection.submitError');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitle = t(`smartSelection.steps.${step}.title`);
  const stepHint = t(`smartSelection.steps.${step}.hint`);

  return (
    <div className="card p-5 md:p-6" data-testid="smart-selection-wizard">
      <div className="mb-6">
        <p className="text-sm text-text-secondary mb-2">
          {t('smartSelection.progress', {
            current: String(step + 1),
            total: String(STEP_COUNT),
          })}
        </p>
        <div className="h-2 rounded-full bg-primary-500/15 overflow-hidden">
          <div
            className="h-full bg-primary-600 transition-all duration-300"
            style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
          />
        </div>
      </div>

      <h2 className="text-xl md:text-2xl font-bold text-primary-900 mb-2">{stepTitle}</h2>
      {stepHint ? <p className="text-text-secondary mb-6">{stepHint}</p> : <div className="mb-6" />}

      {step === 0 && (
        <SmartSelectionOptionGrid
          options={purposeOptions}
          selected={answers.purposes}
          onSelect={handlePurposeSelect}
          multiple
          maxSelected={3}
        />
      )}

      {step === 1 && (
        <SmartSelectionOptionGrid
          name="smart-selection-driving-mode"
          options={drivingOptions}
          selected={answers.drivingMode}
          onSelect={(value) => setAnswers((prev) => ({ ...prev, drivingMode: value }))}
        />
      )}

      {step === 2 && (
        <>
          <SmartSelectionOptionGrid
            name="smart-selection-budget"
            options={budgetOptions}
            selected={answers.budgetPreset}
            onSelect={(value) => setAnswers((prev) => ({ ...prev, budgetPreset: value }))}
          />
          <div className="mt-6 border-t border-primary-500/20 pt-6">
            <Checkbox
              checked={answers.flexibleBudget}
              onChange={(checked) => setAnswers((prev) => ({ ...prev, flexibleBudget: checked }))}
              label={t('smartSelection.flexibleBudget')}
              className="items-start"
              labelClassName="leading-snug pt-0.5"
              data-testid="smart-selection-flexible-budget"
            />
          </div>
        </>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-primary-900 mb-3">
              {t('smartSelection.sizeLabel')}
            </p>
            <SmartSelectionOptionGrid
              name="smart-selection-size"
              options={sizeOptions}
              selected={answers.size}
              onSelect={(value) => setAnswers((prev) => ({ ...prev, size: value }))}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-900 mb-3">
              {t('smartSelection.bodyTypesLabel')}
            </p>
            <SmartSelectionOptionGrid
              options={bodyTypeOptions}
              selected={answers.bodyTypes}
              onSelect={handleBodyTypeSelect}
              multiple
              maxSelected={4}
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-primary-900 mb-3">
              {t('smartSelection.transmissionLabel')}
            </p>
            <SmartSelectionOptionGrid
              name="smart-selection-transmission"
              options={transmissionOptions}
              selected={answers.transmission}
              onSelect={(value) => setAnswers((prev) => ({ ...prev, transmission: value }))}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-900 mb-3">
              {t('smartSelection.fuelsLabel')}
            </p>
            <SmartSelectionOptionGrid
              options={fuelOptions}
              selected={answers.fuels}
              onSelect={handleFuelSelect}
              multiple
              maxSelected={4}
            />
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-primary-900 mb-3">
              {t('smartSelection.yearLabel')}
            </p>
            <SmartSelectionOptionGrid
              name="smart-selection-year"
              options={yearOptions}
              selected={answers.yearPreset}
              onSelect={(value) => setAnswers((prev) => ({ ...prev, yearPreset: value }))}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-900 mb-3">
              {t('smartSelection.mileageLabel')}
            </p>
            <SmartSelectionOptionGrid
              name="smart-selection-mileage"
              options={mileageOptions}
              selected={answers.mileagePreset}
              onSelect={(value) => setAnswers((prev) => ({ ...prev, mileagePreset: value }))}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-900 mb-3">
              {t('smartSelection.prioritiesLabel')}
            </p>
            <SmartSelectionOptionGrid
              options={priorityOptions}
              selected={answers.priorities}
              onSelect={handlePrioritySelect}
              multiple
              maxSelected={3}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 mt-8">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
          className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 py-3 rounded-lg border-2 border-gray-500/40 text-text-secondary font-semibold disabled:opacity-50"
          data-testid="smart-selection-back"
        >
          {t('smartSelection.back')}
        </button>
        {isLastStep ? (
          <LoadingButton
            type="button"
            onClick={() => void handleSubmit()}
            loading={submitting}
            loaderInstant
            disabled={!canGoNext || submitting}
            className={primaryActionButtonClass}
            data-testid="smart-selection-submit"
          >
            {t('smartSelection.submit')}
          </LoadingButton>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEP_COUNT - 1, s + 1))}
            disabled={!canGoNext || submitting}
            className={primaryActionButtonClass}
            data-testid="smart-selection-next"
          >
            {t('smartSelection.next')}
          </button>
        )}
      </div>
    </div>
  );
}
