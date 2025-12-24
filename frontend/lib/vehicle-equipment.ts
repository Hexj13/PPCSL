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
] as const;

export type VehicleEquipmentKey = (typeof VEHICLE_EQUIPMENT_KEYS)[number];
