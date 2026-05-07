'use client';

import { MobileTireSheetsGroupA } from './MobileTireSheetsGroupA';
import { MobileTireSheetsGroupB } from './MobileTireSheetsGroupB';
import type { MobileTireSheetsProps } from './mobile-tire-sheets-types';

export type { MobileTireSheetsProps, TireFeatureMulti } from './mobile-tire-sheets-types';

export function MobileTireSheets(props: MobileTireSheetsProps) {
  return (
    <>
      <MobileTireSheetsGroupA {...props} />
      <MobileTireSheetsGroupB {...props} />
    </>
  );
}
