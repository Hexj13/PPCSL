'use client';

import { EquipmentSection } from '../EquipmentSection';
import type { ListingFormSectionProps } from '../types';

import { ConditionRegistration } from './ConditionRegistration';
import { InteriorExteriorFields } from './InteriorExteriorFields';
import { SpecsGrid } from './SpecsGrid';

export function TechnicalSpecsSection(props: ListingFormSectionProps) {
  return (
    <>
      <SpecsGrid {...props} />
      <EquipmentSection {...props} />
      <ConditionRegistration {...props} />
      <InteriorExteriorFields {...props} />
    </>
  );
}
