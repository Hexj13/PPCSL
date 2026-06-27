import {
  TIRE_ASPECT_RATIO_MAX,
  TIRE_ASPECT_RATIO_MIN,
  TIRE_ASPECT_RATIO_STEP,
  TIRE_DIAMETER_INCH_MAX,
  TIRE_DIAMETER_INCH_MIN,
  TIRE_DIAMETER_INCH_STEP,
  TIRE_WIDTH_MM_MAX,
  TIRE_WIDTH_MM_MIN,
} from '../constants';
import type { LabeledOption } from '../utils';

function formatIntegerWithSpaces(n: number): string {
  const s = String(Math.round(n));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function pushIntegerRange(values: Set<number>, start: number, end: number, step: number): void {
  for (let v = start; v <= end; v += step) {
    values.add(v);
  }
}

function pushDecimalRange(
  values: Set<number>,
  start: number,
  end: number,
  step: number,
  decimals: number,
): void {
  const factor = 10 ** decimals;
  const startScaled = Math.round(start * factor);
  const endScaled = Math.round(end * factor);
  const stepScaled = Math.round(step * factor);
  for (let v = startScaled; v <= endScaled; v += stepScaled) {
    values.add(v / factor);
  }
}

function sortedIntegerOptions(values: Set<number>): Array<LabeledOption<string>> {
  return Array.from(values)
    .sort((a, b) => a - b)
    .map((n) => {
      const value = String(n);
      return { value, label: formatIntegerWithSpaces(n) };
    });
}

function formatEngineFilterValue(n: number): string {
  return n.toFixed(1).replace(/\.?0+$/, '');
}

function formatEngineFilterLabel(n: number): string {
  return n.toFixed(1);
}

function formatTireDiameterValue(n: number): string {
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1);
}

export function getPriceFilterOptions(): Array<LabeledOption<string>> {
  const values = new Set<number>();
  pushIntegerRange(values, 100, 1000, 100);
  pushIntegerRange(values, 1500, 10000, 500);
  pushIntegerRange(values, 11000, 50000, 1000);
  pushIntegerRange(values, 55000, 100000, 5000);
  pushIntegerRange(values, 110000, 200000, 10000);
  return sortedIntegerOptions(values);
}

export function getMileageFilterOptions(): Array<LabeledOption<string>> {
  const values = new Set<number>();
  values.add(0);
  pushIntegerRange(values, 5000, 150000, 5000);
  pushIntegerRange(values, 160000, 300000, 10000);
  pushIntegerRange(values, 325000, 500000, 25000);
  return sortedIntegerOptions(values);
}

export function getPowerFilterOptions(): Array<LabeledOption<string>> {
  const values = new Set<number>();
  pushIntegerRange(values, 20, 300, 10);
  pushIntegerRange(values, 325, 500, 25);
  pushIntegerRange(values, 550, 1000, 50);
  return Array.from(values)
    .sort((a, b) => a - b)
    .map((n) => {
      const value = String(n);
      return { value, label: value };
    });
}

export function getEngineVolumeFilterOptions(
  vehicleType?: 'car' | 'truck' | 'moto',
): Array<LabeledOption<string>> {
  const values = new Set<number>();
  pushDecimalRange(values, 0.1, 2.0, 0.1, 1);
  pushDecimalRange(values, 2.5, 5.0, 0.5, 1);
  if (vehicleType !== 'moto') {
    pushIntegerRange(values, 6, 20, 1);
  }
  return Array.from(values)
    .sort((a, b) => a - b)
    .map((n) => ({
      value: formatEngineFilterValue(n),
      label: formatEngineFilterLabel(n),
    }));
}

export function getTireWidthFilterOptions(): Array<LabeledOption<string>> {
  const values = new Set<number>();
  pushIntegerRange(values, TIRE_WIDTH_MM_MIN, TIRE_WIDTH_MM_MAX, 10);
  return Array.from(values)
    .sort((a, b) => a - b)
    .map((n) => {
      const value = String(n);
      return { value, label: value };
    });
}

export function getTireProfileFilterOptions(): Array<LabeledOption<string>> {
  const values = new Set<number>();
  pushIntegerRange(values, TIRE_ASPECT_RATIO_MIN, TIRE_ASPECT_RATIO_MAX, TIRE_ASPECT_RATIO_STEP);
  return Array.from(values)
    .sort((a, b) => a - b)
    .map((n) => {
      const value = String(n);
      return { value, label: value };
    });
}

export function getTireDiameterFilterOptions(): Array<LabeledOption<string>> {
  const values = new Set<number>();
  pushDecimalRange(
    values,
    TIRE_DIAMETER_INCH_MIN,
    TIRE_DIAMETER_INCH_MAX,
    TIRE_DIAMETER_INCH_STEP,
    1,
  );
  return Array.from(values)
    .sort((a, b) => a - b)
    .map((n) => {
      const value = formatTireDiameterValue(n);
      return { value, label: value };
    });
}
