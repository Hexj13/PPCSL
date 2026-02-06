import { BODY_TYPES_BY_VEHICLE_TYPE } from '../../../common/constants';

export function getVehicleTypeFromBodyType(
  bodyType: string | null,
): 'car' | 'truck' | 'moto' | undefined {
  if (!bodyType) return undefined;
  for (const [vehicleType, bodyTypes] of Object.entries(BODY_TYPES_BY_VEHICLE_TYPE)) {
    if ((bodyTypes as readonly string[]).includes(bodyType)) {
      return vehicleType as 'car' | 'truck' | 'moto';
    }
  }
  return undefined;
}
