'use client';

import { useId, type CSSProperties } from 'react';

import { Checkbox } from '@/ui';

type SmartSelectionOption<T extends string> = { value: T; label: string };

type SmartSelectionOptionGridProps<T extends string> = {
  options: Array<SmartSelectionOption<T>>;
  selected: T | T[] | '';
  onSelect: (_value: T) => void;
  multiple?: boolean;
  maxSelected?: number;
  name?: string;
  testIdPrefix?: string;
};

export function SmartSelectionOptionGrid<T extends string>({
  options,
  selected,
  onSelect,
  multiple = false,
  maxSelected = 3,
  name,
  testIdPrefix = 'smart-selection-option',
}: SmartSelectionOptionGridProps<T>) {
  const fallbackName = useId();
  const radioGroupName = name ?? fallbackName;

  const selectedSet = new Set(Array.isArray(selected) ? selected : selected ? [selected] : []);

  const isSelected = (value: T) => selectedSet.has(value);

  const useTwoColumns = options.length > 5;
  const columnRowCount = Math.ceil(options.length / 2);

  const listClassName = useTwoColumns
    ? 'list-none m-0 p-0 flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:grid-flow-col sm:gap-x-8 sm:gap-y-3 sm:[grid-template-rows:repeat(var(--grid-rows),minmax(0,auto))]'
    : 'list-none m-0 p-0 flex flex-col gap-3';

  const listStyle: CSSProperties | undefined = useTwoColumns
    ? ({ '--grid-rows': String(columnRowCount) } as CSSProperties)
    : undefined;

  const renderCheckboxOption = (option: SmartSelectionOption<T>) => {
    const active = isSelected(option.value);
    const disabled = !active && selectedSet.size >= maxSelected;

    return (
      <li key={option.value}>
        <Checkbox
          checked={active}
          disabled={disabled}
          onChange={() => onSelect(option.value)}
          label={option.label}
          className="items-start"
          labelClassName="leading-snug pt-0.5"
          data-testid={`${testIdPrefix}-${option.value}`}
        />
      </li>
    );
  };

  const renderRadioOption = (option: SmartSelectionOption<T>) => {
    const active = isSelected(option.value);
    const optionId = `${radioGroupName}-${option.value}`;

    return (
      <li key={option.value}>
        <label htmlFor={optionId} className="flex items-start gap-3 cursor-pointer group">
          <span className="relative shrink-0">
            <input
              type="radio"
              id={optionId}
              name={radioGroupName}
              checked={active}
              onChange={() => onSelect(option.value)}
              data-testid={`${testIdPrefix}-${option.value}`}
              className="sr-only"
            />
            <span
              aria-hidden
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                active
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-primary-700 bg-bg-secondary group-hover:border-primary-900'
              }`}
            >
              {active && <span className="w-2.5 h-2.5 rounded-full bg-primary-600" />}
            </span>
          </span>
          <span
            className={`text-sm leading-snug pt-0.5 transition-colors duration-200 ${
              active
                ? 'text-primary-700 font-medium'
                : 'text-text-primary group-hover:text-primary-900'
            }`}
          >
            {option.label}
          </span>
        </label>
      </li>
    );
  };

  return (
    <ul className={listClassName} style={listStyle} role={multiple ? 'group' : 'radiogroup'}>
      {options.map((option) =>
        multiple ? renderCheckboxOption(option) : renderRadioOption(option),
      )}
    </ul>
  );
}
