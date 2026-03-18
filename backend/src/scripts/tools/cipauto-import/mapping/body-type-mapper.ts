import { BodyType } from '../../../../common/types';

export function mapBodyType(raw?: string): { value: BodyType; warning?: string } {
  if (!raw) {
    return { value: BodyType.SUV, warning: 'UNMAPPED_BODY:undefined' };
  }

  const normalized = normalize(raw);
  const mapping: Array<{ pattern: RegExp; value: BodyType }> = [
    { pattern: /sedan/, value: BodyType.Sedan },
    { pattern: /(hatch|hatchback)/, value: BodyType.Hatchback },
    { pattern: /(combi|break|wagon|touring)/, value: BodyType.Wagon },
    { pattern: /(suv|crossover)/, value: BodyType.SUV },
    { pattern: /(coupe|coup)/, value: BodyType.Coupe },
    { pattern: /(cabrio|cabriolet|convertible)/, value: BodyType.Convertible },
    { pattern: /(van|furgon)/, value: BodyType.Van },
    { pattern: /(pickup|pick-up)/, value: BodyType.Pickup },
    { pattern: /(minivan|monovolum|mpv)/, value: BodyType.Minivan },
    { pattern: /(truck|camion)/, value: BodyType.Truck },
  ];

  const found = mapping.find((entry) => entry.pattern.test(normalized));
  if (!found) {
    return { value: BodyType.SUV, warning: `UNMAPPED_BODY:${raw}` };
  }
  if (found.value === BodyType.SUV && !/(suv)/.test(normalized)) {
    return { value: found.value, warning: `UNMAPPED_BODY:${raw}` };
  }
  return { value: found.value };
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ');
}
