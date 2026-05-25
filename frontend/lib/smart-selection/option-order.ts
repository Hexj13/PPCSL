import type {
  SmartBodyTypeChoice,
  SmartDrivingMode,
  SmartFuelChoice,
  SmartMileagePreset,
  SmartPriority,
  SmartPurpose,
  SmartSelectionAnswers,
  SmartSize,
  SmartTransmissionChoice,
  SmartYearPreset,
} from './types';
import {
  SMART_BODY_TYPE_CHOICES,
  SMART_DRIVING_MODES,
  SMART_FUEL_CHOICES,
  SMART_MILEAGE_PRESETS,
  SMART_PRIORITIES,
  SMART_PURPOSES,
  SMART_SIZES,
  SMART_TRANSMISSION_CHOICES,
  SMART_YEAR_PRESETS,
} from './types';

type WizardAnswers = Pick<
  SmartSelectionAnswers,
  'purposes' | 'drivingMode' | 'size' | 'bodyTypes' | 'transmission' | 'fuels' | 'priorities'
>;

type ScoreBoost<T extends string> = {
  applies: boolean;
  values: readonly T[];
  amount: number;
};

function sortByRelevance<T extends string>(
  items: readonly T[],
  score: (item: T) => number,
  pinLast: readonly T[] = [],
): T[] {
  const lastSet = new Set(pinLast);
  const ranked = items
    .filter((item) => !lastSet.has(item))
    .map((item, index) => ({ item, score: score(item), index }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
  const pinned = pinLast.filter((item) => items.includes(item));
  return [...ranked, ...pinned];
}

function purposeSet(purposes: SmartPurpose[]): Set<SmartPurpose> {
  return new Set(purposes);
}

function applyBoosts<T extends string>(value: T, boosts: Array<ScoreBoost<T>>): number {
  return boosts.reduce(
    (total, boost) =>
      boost.applies && boost.values.includes(value) ? total + boost.amount : total,
    0,
  );
}

const PURPOSE_SCORE: Record<SmartPurpose, number> = {
  city: 100,
  commute: 96,
  family: 92,
  first_car: 88,
  long_trips: 82,
  comfort: 78,
  business: 74,
  travel: 70,
  taxi_work: 52,
  active_offroad: 48,
};

export function orderPurposes(): SmartPurpose[] {
  return sortByRelevance(SMART_PURPOSES, (p) => PURPOSE_SCORE[p]);
}

export function orderDrivingModes(purposes: SmartPurpose[]): SmartDrivingMode[] {
  const purposesSelected = purposeSet(purposes);
  return sortByRelevance(SMART_DRIVING_MODES, (mode) => {
    let s = 40;
    if (mode === 'mixed') s += 25;
    if (mode === 'city_highway') s += 22;
    if (mode === 'city') s += 18;
    if (mode === 'highway') s += 15;
    if (mode === 'rural_bad_roads') s += 8;

    if (
      purposesSelected.has('city') ||
      purposesSelected.has('commute') ||
      purposesSelected.has('first_car')
    ) {
      if (mode === 'city') s += 35;
      if (mode === 'city_highway') s += 28;
      if (mode === 'mixed') s += 20;
    }
    if (
      purposesSelected.has('long_trips') ||
      purposesSelected.has('travel') ||
      purposesSelected.has('business')
    ) {
      if (mode === 'highway') s += 32;
      if (mode === 'city_highway') s += 26;
      if (mode === 'mixed') s += 18;
    }
    if (purposesSelected.has('family')) {
      if (mode === 'mixed') s += 30;
      if (mode === 'city_highway') s += 24;
    }
    if (purposesSelected.has('active_offroad')) {
      if (mode === 'rural_bad_roads') s += 40;
      if (mode === 'mixed') s += 15;
    }
    return s;
  });
}

export function orderSizes(purposes: SmartPurpose[]): SmartSize[] {
  const purposesSelected = purposeSet(purposes);
  return sortByRelevance(
    SMART_SIZES,
    (size) => {
      if (size === 'any') return 5;
      let s = size === 'medium' ? 50 : size === 'small' ? 40 : 35;
      if (
        purposesSelected.has('city') ||
        purposesSelected.has('commute') ||
        purposesSelected.has('first_car')
      ) {
        if (size === 'small') s += 35;
        if (size === 'medium') s += 25;
      }
      if (purposesSelected.has('family') || purposesSelected.has('long_trips')) {
        if (size === 'large') s += 35;
        if (size === 'medium') s += 28;
      }
      if (purposesSelected.has('active_offroad') || purposesSelected.has('taxi_work')) {
        if (size === 'large') s += 30;
        if (size === 'medium') s += 20;
      }
      return s;
    },
    ['any'],
  );
}

function preferredBodyTypeScores(
  purposes: SmartPurpose[],
  drivingMode: SmartSelectionAnswers['drivingMode'],
): Map<string, number> {
  const scores = new Map<string, number>();
  const add = (types: string[], weight: number) => {
    types.forEach((type, index) => {
      const prev = scores.get(type) ?? 0;
      scores.set(type, prev + weight - index);
    });
  };

  const purposesSelected = purposeSet(purposes);
  if (
    purposesSelected.has('city') ||
    purposesSelected.has('commute') ||
    purposesSelected.has('first_car')
  ) {
    add(['Hatchback', 'Sedan'], 90);
  }
  if (
    purposesSelected.has('family') ||
    purposesSelected.has('long_trips') ||
    purposesSelected.has('travel')
  ) {
    add(['Wagon', 'SUV', 'Minivan'], 88);
  }
  if (purposesSelected.has('business') || purposesSelected.has('comfort')) {
    add(['Sedan', 'SUV', 'Wagon'], 82);
  }
  if (purposesSelected.has('active_offroad') || purposesSelected.has('taxi_work')) {
    add(['SUV', 'Pickup'], 86);
  }

  if (drivingMode === 'city') add(['Hatchback', 'Sedan'], 70);
  else if (drivingMode === 'highway') add(['Sedan', 'Wagon'], 70);
  else if (drivingMode === 'rural_bad_roads') add(['SUV', 'Pickup', 'Wagon'], 75);
  else if (drivingMode) add(['Hatchback', 'Sedan', 'Wagon', 'SUV'], 60);

  return scores;
}

export function orderBodyTypes(
  purposes: SmartPurpose[],
  drivingMode: SmartSelectionAnswers['drivingMode'],
): SmartBodyTypeChoice[] {
  const preferred = preferredBodyTypeScores(purposes, drivingMode);
  return sortByRelevance(SMART_BODY_TYPE_CHOICES, (body) => preferred.get(body) ?? 0, [
    'auto_pick',
  ]);
}

export function orderTransmissions(
  purposes: SmartPurpose[],
  drivingMode: SmartSelectionAnswers['drivingMode'],
): SmartTransmissionChoice[] {
  const purposesSelected = purposeSet(purposes);
  return sortByRelevance(SMART_TRANSMISSION_CHOICES, (choice) => {
    let s =
      choice === 'prefer_automatic'
        ? 90
        : choice === 'any'
          ? 85
          : choice === 'automatic_only'
            ? 78
            : choice === 'prefer_manual'
              ? 35
              : 25;

    if (
      purposesSelected.has('city') ||
      purposesSelected.has('commute') ||
      purposesSelected.has('first_car') ||
      purposesSelected.has('comfort')
    ) {
      if (choice === 'prefer_automatic' || choice === 'automatic_only') s += 20;
      if (choice === 'any') s += 12;
    }
    if (purposesSelected.has('active_offroad') || purposesSelected.has('taxi_work')) {
      if (choice === 'any') s += 18;
      if (choice === 'prefer_automatic') s += 10;
    }
    if (drivingMode === 'highway' || drivingMode === 'city_highway') {
      if (choice === 'prefer_automatic' || choice === 'any') s += 12;
    }
    if (drivingMode === 'rural_bad_roads') {
      if (choice === 'any' || choice === 'manual_only' || choice === 'prefer_manual') s += 10;
    }
    return s;
  });
}

export function orderFuels(answers: WizardAnswers): SmartFuelChoice[] {
  const purposesSelected = purposeSet(answers.purposes);
  const fuelBaseScore: Record<Exclude<SmartFuelChoice, 'any' | 'auto_pick'>, number> = {
    Petrol: 80,
    Diesel: 72,
    LPG: 68,
    Hybrid: 58,
    Electric: 54,
  };
  const fuelBoosts: Array<ScoreBoost<Exclude<SmartFuelChoice, 'any' | 'auto_pick'>>> = [
    {
      applies:
        answers.drivingMode === 'city' ||
        answers.drivingMode === 'mixed' ||
        purposesSelected.has('city') ||
        purposesSelected.has('commute'),
      values: ['Petrol', 'Hybrid', 'LPG'],
      amount: 22,
    },
    {
      applies:
        answers.drivingMode === 'highway' ||
        answers.drivingMode === 'city_highway' ||
        purposesSelected.has('long_trips'),
      values: ['Diesel', 'Petrol'],
      amount: 22,
    },
    {
      applies: answers.drivingMode === 'rural_bad_roads' || purposesSelected.has('active_offroad'),
      values: ['Diesel', 'Petrol'],
      amount: 20,
    },
    {
      applies: purposesSelected.has('first_car'),
      values: ['Petrol', 'LPG'],
      amount: 15,
    },
  ];

  return sortByRelevance(
    SMART_FUEL_CHOICES,
    (fuel) => {
      if (fuel === 'auto_pick' || fuel === 'any') return -100;
      return fuelBaseScore[fuel] + applyBoosts(fuel, fuelBoosts);
    },
    ['any', 'auto_pick'],
  );
}

export function orderYearPresets(
  purposes: SmartPurpose[],
  priorities: SmartPriority[],
): SmartYearPreset[] {
  const purposesSelected = purposeSet(purposes);
  const prioritySet = new Set(priorities);
  const maxAgeByPreset: Record<Exclude<SmartYearPreset, 'any'>, number> = {
    not_older_than_2: 2,
    not_older_than_3: 3,
    not_older_than_5: 5,
    not_older_than_7: 7,
    not_older_than_10: 10,
  };

  return sortByRelevance(
    SMART_YEAR_PRESETS,
    (preset) => {
      if (preset === 'any') return 5;
      const maxAge = maxAgeByPreset[preset];
      let s = 120 - maxAge * 10;
      if (prioritySet.has('fresh_year')) s += (12 - maxAge) * 8;
      if (prioritySet.has('reliability') || prioritySet.has('low_maintenance')) {
        if (maxAge <= 7) s += 20;
        if (maxAge >= 7) s += 10;
      }
      if (purposesSelected.has('first_car') || purposesSelected.has('city')) {
        if (maxAge <= 5) s += 15;
      }
      if (purposesSelected.has('business') || purposesSelected.has('comfort')) {
        if (maxAge <= 5) s += 18;
      }
      return s;
    },
    ['any'],
  );
}

export function orderMileagePresets(
  purposes: SmartPurpose[],
  priorities: SmartPriority[],
): SmartMileagePreset[] {
  const purposesSelected = purposeSet(purposes);
  const prioritySet = new Set(priorities);
  return sortByRelevance(
    SMART_MILEAGE_PRESETS,
    (preset) => {
      if (preset === 'any') return 5;
      const km =
        preset === 'up_to_50000'
          ? 50000
          : preset === 'up_to_100000'
            ? 100000
            : preset === 'up_to_150000'
              ? 150000
              : 200000;
      let s = 200000 - km;
      if (prioritySet.has('low_mileage')) s += (200000 - km) / 5000;
      if (prioritySet.has('reliability') || prioritySet.has('resale')) {
        if (km <= 150000) s += 30;
        if (km <= 100000) s += 20;
      }
      if (
        purposesSelected.has('city') ||
        purposesSelected.has('commute') ||
        purposesSelected.has('first_car')
      ) {
        if (km <= 150000) s += 15;
      }
      if (purposesSelected.has('taxi_work')) {
        if (km <= 200000) s += 12;
      }
      return s;
    },
    ['any'],
  );
}

export function orderPriorities(
  purposes: SmartPurpose[],
  drivingMode: SmartSelectionAnswers['drivingMode'],
): SmartPriority[] {
  const purposesSelected = purposeSet(purposes);
  const priorityBaseScore: Record<SmartPriority, number> = {
    reliability: 95,
    low_consumption: 92,
    low_maintenance: 90,
    safety: 86,
    comfort: 82,
    low_mileage: 78,
    fresh_year: 74,
    luggage: 70,
    resale: 65,
    equipment: 62,
    dynamics: 45,
    looks: 40,
  };
  const priorityBoosts: Array<ScoreBoost<SmartPriority>> = [
    {
      applies:
        purposesSelected.has('city') ||
        purposesSelected.has('commute') ||
        purposesSelected.has('first_car'),
      values: ['low_consumption', 'low_maintenance'],
      amount: 22,
    },
    {
      applies:
        purposesSelected.has('city') ||
        purposesSelected.has('commute') ||
        purposesSelected.has('first_car'),
      values: ['reliability'],
      amount: 18,
    },
    {
      applies: purposesSelected.has('family'),
      values: ['safety', 'luggage', 'comfort'],
      amount: 25,
    },
    {
      applies: purposesSelected.has('long_trips') || purposesSelected.has('travel'),
      values: ['comfort', 'luggage', 'reliability'],
      amount: 22,
    },
    {
      applies: purposesSelected.has('comfort') || purposesSelected.has('business'),
      values: ['comfort', 'equipment'],
      amount: 20,
    },
    {
      applies: purposesSelected.has('active_offroad'),
      values: ['reliability', 'safety'],
      amount: 18,
    },
    {
      applies: drivingMode === 'rural_bad_roads',
      values: ['reliability', 'safety'],
      amount: 15,
    },
    {
      applies: drivingMode === 'highway',
      values: ['low_consumption', 'comfort'],
      amount: 12,
    },
  ];

  return sortByRelevance(SMART_PRIORITIES, (priority) => {
    return priorityBaseScore[priority] + applyBoosts(priority, priorityBoosts);
  });
}
