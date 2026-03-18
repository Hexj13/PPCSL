import { FuelType } from '../../../../common/types';

interface EstimateHorsepowerInput {
  description?: string;
  engineVolumeL?: number;
  fuel?: FuelType;
  horsepowerFromPdp?: number;
  defaultHorsepower: number;
}

export function estimateHorsepower(input: EstimateHorsepowerInput): {
  horsepower: number;
  estimated: boolean;
} {
  if (typeof input.horsepowerFromPdp === 'number' && Number.isFinite(input.horsepowerFromPdp)) {
    return { horsepower: clamp(input.horsepowerFromPdp), estimated: false };
  }

  const fromText = extractHorsepowerFromText(input.description);
  if (fromText) {
    return { horsepower: clamp(fromText), estimated: false };
  }

  if (input.engineVolumeL && input.engineVolumeL > 0) {
    const ratio = getRatio(input.fuel);
    const estimated = Math.round(input.engineVolumeL * ratio);
    return { horsepower: clamp(estimated), estimated: true };
  }

  return { horsepower: clamp(input.defaultHorsepower), estimated: true };
}

function extractHorsepowerFromText(text?: string): number | null {
  if (!text) {
    return null;
  }
  const normalized = text.replace(/\s+/g, ' ');
  const match = normalized.match(/(\d{2,4})\s*(cp|hp|ps|кс|к\.с\.)/i);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

function getRatio(fuel?: FuelType): number {
  switch (fuel) {
    case FuelType.Diesel:
      return 60;
    case FuelType.Hybrid:
      return 80;
    case FuelType.Electric:
      return 110;
    case FuelType.LPG:
      return 70;
    case FuelType.Petrol:
    default:
      return 75;
  }
}

function clamp(value: number): number {
  if (value < 1) return 1;
  if (value > 9999) return 9999;
  return value;
}
