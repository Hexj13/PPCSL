'use client';

import { EquipmentSection } from '../EquipmentSection';
import type { ListingFormSectionProps } from '../types';

import { ConditionRegistration } from './ConditionRegistration';
import { ExteriorFields } from './ExteriorFields';
import { SpecsGrid } from './SpecsGrid';

export function TechnicalSpecsSection(props: ListingFormSectionProps) {
  return (
    <>
      <SpecsGrid {...props} />
      <EquipmentSection {...props} />
      <ConditionRegistration {...props} />
      <ExteriorFields {...props} />
    </>
  );
}
