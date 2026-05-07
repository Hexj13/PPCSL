'use client';

import { MobileVehicleSheetsGroupA } from './MobileVehicleSheetsGroupA';
import { MobileVehicleSheetsGroupB } from './MobileVehicleSheetsGroupB';
import type { MobileVehicleSheetsProps } from './mobile-vehicle-sheets-types';

export type { MobileVehicleSheetsProps } from './mobile-vehicle-sheets-types';

export function MobileVehicleSheets(props: MobileVehicleSheetsProps) {
  return (
    <>
      <MobileVehicleSheetsGroupA {...props} />
      <MobileVehicleSheetsGroupB {...props} />
    </>
  );
}
