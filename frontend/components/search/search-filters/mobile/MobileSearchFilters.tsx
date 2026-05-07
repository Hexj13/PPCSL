'use client';

import { MobileTireSection } from './MobileTireSection';
import { MobileVehicleSection } from './MobileVehicleSection';
import type { MobileSearchFiltersProps } from './mobile-search-filters-types';

export type {
  MobileSearchFiltersProps,
  MobileSearchFiltersSharedHandlers,
  MobileSearchFiltersTireProps,
  MobileSearchFiltersVehicleProps,
} from './mobile-search-filters-types';

export function MobileSearchFilters(props: MobileSearchFiltersProps) {
  if (props.variant === 'tire') {
    return <MobileTireSection {...props} />;
  }

  return <MobileVehicleSection {...props} />;
}
