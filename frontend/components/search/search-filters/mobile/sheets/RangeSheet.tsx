'use client';

import { useTranslation } from '@/hooks/useTranslation';

import type { MultiSelectOption } from './MultiSelectSheet';
import { ScrollSnapDualPicker } from './ScrollSnapDualPicker';

interface RangeSheetContentProps {
  variant: 'dual-input' | 'dual-select';
  fromLabel: string;
  toLabel: string;
  fromValue: string;
  toValue: string;
  onFromChange: (_v: string) => void;
  onToChange: (_v: string) => void;
  onFromBlur?: (_value: string) => void;
  onToBlur?: (_value: string) => void;
  selectOptions?: MultiSelectOption[];
  emptySelectLabel?: string;
  showDualSelectColumnLabels?: boolean;
  showDualInputColumnLabels?: boolean;
  fromInputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  toInputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}

export function RangeSheetContent({
  variant,
  fromLabel,
  toLabel,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  onFromBlur,
  onToBlur,
  selectOptions = [],
  emptySelectLabel = '',
  showDualSelectColumnLabels = true,
  showDualInputColumnLabels = true,
  fromInputMode,
  toInputMode,
}: RangeSheetContentProps) {
  const { t } = useTranslation();
  const dash = t('common.rangeDash');

  if (variant === 'dual-select') {
    const flatOptions = selectOptions
      .filter((o) => o.value && !String(o.value).startsWith('__category__'))
      .map((o) => ({ value: o.value, label: o.label }));
    return (
      <ScrollSnapDualPicker
        fromLabel={fromLabel}
        toLabel={toLabel}
        fromValue={fromValue}
        toValue={toValue}
        onFromChange={onFromChange}
        onToChange={onToChange}
        options={flatOptions}
        emptyOptionLabel={emptySelectLabel}
        showColumnLabels={showDualSelectColumnLabels}
      />
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-end gap-3">
        {showDualInputColumnLabels ? (
          <>
            <label className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="text-xs font-semibold text-primary-700">{fromLabel}</span>
              <input
                type="text"
                inputMode={fromInputMode}
                value={fromValue}
                onChange={(e) => onFromChange(e.target.value)}
                onBlur={(e) => onFromBlur?.(e.target.value)}
                className="input-field w-full"
              />
            </label>
            <span className="pb-3 text-primary-700 font-semibold shrink-0">{dash}</span>
            <label className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="text-xs font-semibold text-primary-700">{toLabel}</span>
              <input
                type="text"
                inputMode={toInputMode}
                value={toValue}
                onChange={(e) => onToChange(e.target.value)}
                onBlur={(e) => onToBlur?.(e.target.value)}
                className="input-field w-full"
              />
            </label>
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 flex-col">
              <input
                type="text"
                inputMode={fromInputMode}
                value={fromValue}
                aria-label={fromLabel}
                onChange={(e) => onFromChange(e.target.value)}
                onBlur={(e) => onFromBlur?.(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <span className="shrink-0 pb-3 font-semibold text-primary-700">{dash}</span>
            <div className="flex min-w-0 flex-1 flex-col">
              <input
                type="text"
                inputMode={toInputMode}
                value={toValue}
                aria-label={toLabel}
                onChange={(e) => onToChange(e.target.value)}
                onBlur={(e) => onToBlur?.(e.target.value)}
                className="input-field w-full"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
