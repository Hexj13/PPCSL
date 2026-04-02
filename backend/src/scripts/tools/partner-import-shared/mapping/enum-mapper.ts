import { FuelType, TransmissionType } from '../../../../common/types';

export function mapFuel(raw?: string): { value?: FuelType; warning?: string } {
  if (!raw) {
    return {};
  }

  const normalized = normalize(raw);
  let value: FuelType | undefined;

  if (normalized.includes('pluginhybrid') || normalized === 'phev') {
    value = FuelType.PHEV;
  } else if (
    normalized.includes('mildhybrid') ||
    normalized === 'mhev' ||
    normalized === 'mild' ||
    normalized === '48v'
  ) {
    value = FuelType.MHEV;
  } else if (normalized.includes('hybrid')) {
    value = FuelType.Hybrid;
  } else if (
    normalized.includes('gazbenzina') ||
    normalized === 'lpg' ||
    normalized === 'gpl' ||
    normalized === 'gaz'
  ) {
    value = FuelType.LPG;
  } else if (normalized === 'benzina' || normalized === 'petrol') {
    value = FuelType.Petrol;
  } else if (normalized === 'motorina' || normalized === 'diesel') {
    value = FuelType.Diesel;
  } else if (
    normalized === 'electric' ||
    normalized === 'electrica' ||
    normalized === 'electricitate'
  ) {
    value = FuelType.Electric;
  }

  if (!value) {
    return { warning: `UNMAPPED_FUEL:${raw}` };
  }
  return { value };
}

export function mapTransmission(raw?: string): { value?: TransmissionType; warning?: string } {
  if (!raw) {
    return {};
  }

  const normalized = normalize(raw);
  const mapping: Record<string, TransmissionType> = {
    manuala: TransmissionType.Manual,
    manual: TransmissionType.Manual,
    mecanica: TransmissionType.Manual,
    mecanic: TransmissionType.Manual,
    automata: TransmissionType.Automatic,
    automat: TransmissionType.Automatic,
    automatic: TransmissionType.Automatic,
    automattiptronic: TransmissionType.Automatic,
    tiptronic: TransmissionType.Automatic,
    semiautomata: TransmissionType.Automatic,
    cvt: TransmissionType.CVT,
    variator: TransmissionType.CVT,
    robot: TransmissionType.Robot,
    robotizata: TransmissionType.Robot,
  };

  const value = mapping[normalized];
  if (!value) {
    return { warning: `UNMAPPED_TRANSMISSION:${raw}` };
  }
  return { value };
}

export function mapDriveType(raw?: string): 'FWD' | 'RWD' | 'AWD' | undefined {
  if (!raw) {
    return undefined;
  }
  const normalized = normalize(raw);
  if (
    normalized.includes('fata') ||
    normalized.includes('fwd') ||
    normalized.includes('front') ||
    normalized.includes('4x2fwd')
  ) {
    return 'FWD';
  }
  if (
    normalized.includes('spate') ||
    normalized.includes('rwd') ||
    normalized.includes('rear') ||
    normalized.includes('4x2rwd')
  ) {
    return 'RWD';
  }
  if (
    normalized.includes('integrala') ||
    normalized.includes('4x4') ||
    normalized.includes('awd') ||
    normalized.includes('4matic') ||
    normalized.includes('quattro') ||
    normalized.includes('xdrive')
  ) {
    return 'AWD';
  }

  if (normalized.includes('4x2')) {
    if (normalized.includes('fata') || normalized.includes('fwd') || normalized.includes('front'))
      return 'FWD';
    if (normalized.includes('spate') || normalized.includes('rwd') || normalized.includes('rear'))
      return 'RWD';
  }

  return undefined;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}
