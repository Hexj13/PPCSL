import type { SearchCriteria } from '../../listings/application/ports/listing.repository.port';

import type { SavedFilterRecord, SmartSelectionAnswers } from './smart-selection.types';
import { MIN_SMART_SELECTION_RESULTS } from './smart-selection.types';

const CAR_BODY_TYPES = [
  'Hatchback',
  'Sedan',
  'Wagon',
  'SUV',
  'Coupe',
  'Convertible',
  'Minivan',
  'Pickup',
];
const CAR_FUELS = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'LPG', 'MHEV', 'PHEV'];
const ALL_TRANSMISSIONS = ['Manual', 'Automatic', 'CVT', 'Robot'];

function cloneFilters(filters: SavedFilterRecord): SavedFilterRecord {
  const next: SavedFilterRecord = { ...filters };
  for (const key of ['body_types', 'fuels', 'transmissions', 'drive_types', 'equipment'] as const) {
    const val = filters[key];
    if (Array.isArray(val)) {
      next[key] = [...val];
    }
  }
  return next;
}

function parseNumberField(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : undefined;
}

export function savedFilterToSearchCriteria(filters: SavedFilterRecord): SearchCriteria {
  const criteria: SearchCriteria = {
    page: 1,
    limit: 1,
    vehicleType: 'car',
  };

  const priceLte = parseNumberField(filters.price_lte);
  if (priceLte !== undefined) criteria.price_lte = priceLte;
  const priceGte = parseNumberField(filters.price_gte);
  if (priceGte !== undefined) criteria.price_gte = priceGte;
  const yearGte = parseNumberField(filters.year_gte);
  if (yearGte !== undefined) criteria.year_gte = yearGte;
  const yearLte = parseNumberField(filters.year_lte);
  if (yearLte !== undefined) criteria.year_lte = yearLte;
  const mileageLte = parseNumberField(filters.mileage_lte);
  if (mileageLte !== undefined) criteria.mileage_lte = mileageLte;

  if (typeof filters.currency === 'string' && filters.currency) {
    criteria.currency = filters.currency;
  }

  if (Array.isArray(filters.body_types) && filters.body_types.length > 0) {
    criteria.body_types = filters.body_types as string[];
  }
  if (Array.isArray(filters.fuels) && filters.fuels.length > 0) {
    criteria.fuels = filters.fuels as string[];
  }
  if (Array.isArray(filters.transmissions) && filters.transmissions.length > 0) {
    criteria.transmissions = filters.transmissions as string[];
  }
  if (Array.isArray(filters.drive_types) && filters.drive_types.length > 0) {
    criteria.drive_types = filters.drive_types as string[];
  }
  if (Array.isArray(filters.equipment) && filters.equipment.length > 0) {
    criteria.equipment = filters.equipment as string[];
    criteria.equipmentMatch = filters.equipment_match_mode === 'partial' ? 'partial' : 'full';
  }

  return criteria;
}

function canRelaxTransmission(answers: SmartSelectionAnswers): boolean {
  return answers.transmission !== 'automatic_only' && answers.transmission !== 'manual_only';
}

function requiresDriveType(answers: SmartSelectionAnswers): boolean {
  return answers.drivingMode === 'rural_bad_roads' || answers.purposes.includes('active_offroad');
}

type ExpansionStep = {
  id: string;
  apply: (_filters: SavedFilterRecord) => void;
};

function buildExpansionSteps(answers: SmartSelectionAnswers): ExpansionStep[] {
  const steps: ExpansionStep[] = [];

  steps.push({
    id: 'equipment_partial',
    apply: (f) => {
      if (Array.isArray(f.equipment) && f.equipment.length > 0) {
        f.equipment_match_mode = 'partial';
      }
    },
  });

  if (answers.flexibleBudget) {
    steps.push({
      id: 'budget_plus_10_percent',
      apply: (f) => {
        const current = parseNumberField(f.price_lte);
        if (current !== undefined) {
          f.price_lte = String(Math.round(current * 1.1));
        }
      },
    });
  }

  steps.push({
    id: 'mileage_plus_20k',
    apply: (f) => {
      const current = parseNumberField(f.mileage_lte);
      if (current !== undefined) {
        f.mileage_lte = String(current + 20000);
      }
    },
  });

  steps.push({
    id: 'year_minus_2',
    apply: (f) => {
      const current = parseNumberField(f.year_gte);
      if (current !== undefined && current > 2005) {
        f.year_gte = String(current - 2);
      } else {
        delete f.year_gte;
      }
    },
  });

  steps.push({
    id: 'drop_equipment',
    apply: (f) => {
      delete f.equipment;
      delete f.equipment_match_mode;
    },
  });

  steps.push({
    id: 'expand_body_types',
    apply: (f) => {
      f.body_types = [...CAR_BODY_TYPES];
    },
  });

  steps.push({
    id: 'expand_fuels',
    apply: (f) => {
      f.fuels = [...CAR_FUELS];
    },
  });

  if (!requiresDriveType(answers)) {
    steps.push({
      id: 'drop_drive_types',
      apply: (f) => {
        delete f.drive_types;
      },
    });
  }

  if (canRelaxTransmission(answers)) {
    steps.push({
      id: 'expand_transmissions',
      apply: (f) => {
        f.transmissions = [...ALL_TRANSMISSIONS];
      },
    });
  }

  return steps;
}

export async function expandFilterUntilEnoughResults(
  initialFilters: SavedFilterRecord,
  answers: SmartSelectionAnswers,
  countResults: (_criteria: SearchCriteria) => Promise<number>,
  minResults: number = MIN_SMART_SELECTION_RESULTS,
): Promise<SavedFilterRecord> {
  let filters = cloneFilters(initialFilters);
  let criteria = savedFilterToSearchCriteria(filters);
  let total = await countResults(criteria);
  if (total >= minResults) {
    return filters;
  }

  const steps = buildExpansionSteps(answers);
  for (const step of steps) {
    filters = cloneFilters(filters);
    step.apply(filters);
    criteria = savedFilterToSearchCriteria(filters);
    total = await countResults(criteria);
    if (total >= minResults) {
      return filters;
    }
  }

  return filters;
}
