export const VEHICLE_EQUIPMENT_KEYS = [
  'air_conditioning',
  'leather_seats',
  'sunroof',
  'navigation',
  'parking_sensors',
  'rear_camera',
  'cruise_control',
  'heated_seats',
  'xenon_lights',
  'led_lights',
  'fog_lights',
  'alloy_wheels',
  'electric_windows',
  'central_locking',
  'bluetooth',
  'usb_port',
  'multifunction_steering',
  'start_stop',
  'esp',
  'abs',
  'hydraulic_lift',
  'winch',
  'tachograph',
  'refrigerator',
  'adblue_system',
  'parking_brake',
  'alarm_system',
  'luggage_rack',
  'windshield',
  'heated_grips',
  'quick_shifter',
  'traction_control',
  'riding_modes',
] as const;

export type VehicleEquipmentKey = (typeof VEHICLE_EQUIPMENT_KEYS)[number];

const CAR_EQUIPMENT: readonly VehicleEquipmentKey[] = [
  'air_conditioning',
  'leather_seats',
  'sunroof',
  'navigation',
  'parking_sensors',
  'rear_camera',
  'cruise_control',
  'heated_seats',
  'xenon_lights',
  'led_lights',
  'fog_lights',
  'alloy_wheels',
  'electric_windows',
  'central_locking',
  'bluetooth',
  'usb_port',
  'multifunction_steering',
  'start_stop',
  'esp',
  'abs',
] as const;

const TRUCK_EQUIPMENT: readonly VehicleEquipmentKey[] = [
  'air_conditioning',
  'navigation',
  'parking_sensors',
  'rear_camera',
  'cruise_control',
  'xenon_lights',
  'led_lights',
  'fog_lights',
  'alloy_wheels',
  'electric_windows',
  'central_locking',
  'bluetooth',
  'usb_port',
  'multifunction_steering',
  'esp',
  'abs',
  'hydraulic_lift',
  'winch',
  'tachograph',
  'refrigerator',
  'adblue_system',
  'parking_brake',
  'alarm_system',
] as const;

const MOTO_EQUIPMENT: readonly VehicleEquipmentKey[] = [
  'navigation',
  'led_lights',
  'fog_lights',
  'alloy_wheels',
  'bluetooth',
  'usb_port',
  'abs',
  'alarm_system',
  'luggage_rack',
  'windshield',
  'heated_grips',
  'quick_shifter',
  'traction_control',
  'riding_modes',
] as const;

export function getEquipmentKeysByVehicleType(
  vehicleType?: 'car' | 'truck' | 'moto'
): readonly VehicleEquipmentKey[] {
  switch (vehicleType) {
    case 'truck':
      return TRUCK_EQUIPMENT;
    case 'moto':
      return MOTO_EQUIPMENT;
    case 'car':
    default:
      return CAR_EQUIPMENT;
  }
}
