import { FuelType, TransmissionType } from '../../../../common/types';

export function mapFuel(raw?: string): { value?: FuelType; warning?: string } {
  if (!raw) {
    return {};
  }

  const normalized = normalize(raw);
  const mapping: Record<string, FuelType> = {
    benzina: FuelType.Petrol,
    petrol: FuelType.Petrol,
    motorina: FuelType.Diesel,
    diesel: FuelType.Diesel,
    electric: FuelType.Electric,
    electrica: FuelType.Electric,
    hybrid: FuelType.Hybrid,
    pluginhybrid: FuelType.Hybrid,
    phev: FuelType.Hybrid,
    lpg: FuelType.LPG,
    gpl: FuelType.LPG,
    gaz: FuelType.LPG,
  };

  const value = mapping[normalized];
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
