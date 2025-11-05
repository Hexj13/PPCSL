import React, { ChangeEvent, WheelEvent } from 'react';

export function useNumberInput() {
  const handleWheel = (e: WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.currentTarget.blur();
  };

  const handleEngineVolumeChange = (
    e: ChangeEvent<HTMLInputElement>,
    onChange: (_value: string) => void
  ) => {
    let value = e.target.value.replace(',', '.');
    value = value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts.length === 2 && parts[1].length > 1) {
      value = parts[0] + '.' + parts[1].substring(0, 1);
    }
    onChange(value);
  };

  const handleEngineVolumeBlur = (
    e: React.FocusEvent<HTMLInputElement>,
    onChange: (_value: string) => void
  ) => {
    let value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      if (value < 0.1) {
        value = 0.1;
      } else if (value > 100) {
        value = 100;
      }
      onChange(value.toFixed(1));
    } else if (e.target.value && e.target.value.trim() !== '') {
      const numValue = parseFloat(e.target.value);
      if (!isNaN(numValue)) {
        onChange(numValue.toFixed(1));
      }
    }
  };

  const handleYearBlur = (_value: string, onChange: (_value: string) => void) => {
    if (_value === '') {
      return;
    }

    const year = parseInt(_value);
    const currentYear = new Date().getFullYear();

    if (isNaN(year) || year < 1900 || year > currentYear) {
      onChange('');
    }
  };

  return {
    handleWheel,
    handleEngineVolumeChange,
    handleEngineVolumeBlur,
    handleYearBlur,
  };
}
