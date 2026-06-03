'use client';

import dynamic from 'next/dynamic';

export const AdvancedFilters = dynamic(
  () =>
    import('@/components/search/search-filters/AdvancedFilters').then((m) => ({
      default: m.AdvancedFilters,
    })),
  { ssr: false },
);

export const EquipmentFilters = dynamic(
  () =>
    import('@/components/search/search-filters/EquipmentFilters').then((m) => ({
      default: m.EquipmentFilters,
    })),
  { ssr: false },
);

export const MobileSearchFilters = dynamic(() =>
  import('@/components/search/search-filters/mobile/MobileSearchFilters').then((m) => ({
    default: m.MobileSearchFilters,
  })),
);

export const TireSearchFilters = dynamic(
  () =>
    import('@/components/search/search-filters/TireSearchFilters').then((m) => ({
      default: m.TireSearchFilters,
    })),
  { ssr: false },
);

export const SaveFilterModal = dynamic(
  () => import('@/components/modals/SaveFilterModal').then((m) => ({ default: m.SaveFilterModal })),
  { ssr: false },
);
