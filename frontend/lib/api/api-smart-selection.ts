import type { Currency as CurrencyCode } from '@/lib/types';
import type { SmartSelectionAnswers } from '@/lib/smart-selection/types';

import { api } from './api-client';
import type { SavedFilter } from './api-types';

export type CreateSmartSelectionPayload = {
  purposes: SmartSelectionAnswers['purposes'];
  drivingMode: NonNullable<SmartSelectionAnswers['drivingMode']>;
  budgetPreset: NonNullable<SmartSelectionAnswers['budgetPreset']>;
  currency: CurrencyCode;
  flexibleBudget: boolean;
  size: NonNullable<SmartSelectionAnswers['size']>;
  bodyTypes: SmartSelectionAnswers['bodyTypes'];
  transmission: NonNullable<SmartSelectionAnswers['transmission']>;
  fuels: SmartSelectionAnswers['fuels'];
  yearPreset: NonNullable<SmartSelectionAnswers['yearPreset']>;
  mileagePreset: NonNullable<SmartSelectionAnswers['mileagePreset']>;
  priorities: SmartSelectionAnswers['priorities'];
};

export const smartSelectionApi = {
  createFilter: (payload: CreateSmartSelectionPayload) =>
    api.post<SavedFilter>('/api/smart-selection', payload),
};
