import { BodyType } from '../../../../common/types';

import type { BrandModelVehicleType } from './brand-model-resolver';

type BodyTypeRule = { pattern: RegExp; value: BodyType };

const DEFAULT_BODY_TYPE: Record<BrandModelVehicleType, BodyType> = {
  car: BodyType.SUV,
  truck: BodyType.SpecialEquipment,
  moto: BodyType.Naked,
};

const SHARED_RULES: BodyTypeRule[] = [
  { pattern: /\bsedan\b/, value: BodyType.Sedan },
  { pattern: /\b(hatch|hatchback|liftback)\b/, value: BodyType.Hatchback },
  { pattern: /\b(combi|break|wagon|universal|universala)\b/, value: BodyType.Wagon },
  { pattern: /\b(suv|crossover)\b/, value: BodyType.SUV },
  { pattern: /\b(coupe|coup)\b/, value: BodyType.Coupe },
  { pattern: /\b(cabrio|cabriolet|convertible)\b/, value: BodyType.Convertible },
  { pattern: /\b(minivan|monovolum|mpv|microvan)\b/, value: BodyType.Minivan },
  { pattern: /\b(pickup|pick up)\b/, value: BodyType.Pickup },
];

const VEHICLE_RULES: Record<BrandModelVehicleType, BodyTypeRule[]> = {
  car: [
    { pattern: /\broadster\b/, value: BodyType.Convertible },
    { pattern: /\b(furgon|van)\b/, value: BodyType.Minivan },
  ],
  truck: [
    { pattern: /\b(autobus|microautobus)\b/, value: BodyType.Bus },
    { pattern: /\bautotractor\b/, value: BodyType.Tractor },
    { pattern: /\b(furgon|autorulota)\b/, value: BodyType.Van },
    { pattern: /\b(camioneta|camion|truck)\b/, value: BodyType.Truck },
    {
      pattern:
        /\b(autocisterna|autofrigorifica|autogunoiera|automacara|autotransporter|basculanta|container|cu manipulator|cu prelata|evacuator|platforma|forestiera|vidanja)\b/,
      value: BodyType.SpecialEquipment,
    },
  ],
  moto: [
    { pattern: /\b(atv|quad)\b/, value: BodyType.ATV },
    { pattern: /\bchopper\b/, value: BodyType.Chopper },
    { pattern: /\bclasic\b/, value: BodyType.Classic },
    { pattern: /\bcruiser\b/, value: BodyType.Cruiser },
    { pattern: /\bcustom\b/, value: BodyType.Custom },
    { pattern: /\bdragster\b/, value: BodyType.Dragster },
    { pattern: /\benduro\b/, value: BodyType.Enduro },
    { pattern: /\bmaxi scuter\b/, value: BodyType.MaxiScooter },
    { pattern: /\bminibike\b/, value: BodyType.Minibike },
    { pattern: /\b(supermotard|motard|scarver)\b/, value: BodyType.Motard },
    { pattern: /\bmotociclete grele\b/, value: BodyType.Cruiser },
    { pattern: /\bmotoreta\b/, value: BodyType.Moped },
    { pattern: /\bnaked\b/, value: BodyType.Naked },
    { pattern: /\broadster\b/, value: BodyType.Street },
    { pattern: /\bscuter electric\b/, value: BodyType.ElectricScooter },
    { pattern: /\bscuter\b/, value: BodyType.Scooter },
    { pattern: /\bsnowmobil\b/, value: BodyType.Snowmobile },
    { pattern: /\bsport touring\b/, value: BodyType.SportTouring },
    { pattern: /\bsupersport\b/, value: BodyType.Sport },
    { pattern: /\bsport\b/, value: BodyType.Sport },
    { pattern: /\bstreet\b/, value: BodyType.Street },
    { pattern: /\btouring\b/, value: BodyType.Touring },
    { pattern: /\btrial\b/, value: BodyType.Trial },
    { pattern: /\bcross\b/, value: BodyType.Cross },
  ],
};

export function mapBodyType(
  raw?: string,
  vehicleType: BrandModelVehicleType = 'car',
): { value: BodyType; warning?: string } {
  if (!raw) {
    return {
      value: DEFAULT_BODY_TYPE[vehicleType],
      warning: 'UNMAPPED_BODY:undefined',
    };
  }

  const normalized = normalize(raw);
  const rules = [...VEHICLE_RULES[vehicleType], ...SHARED_RULES];
  const found = rules.find((entry) => entry.pattern.test(normalized));
  if (!found) {
    return { value: DEFAULT_BODY_TYPE[vehicleType], warning: `UNMAPPED_BODY:${raw}` };
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
