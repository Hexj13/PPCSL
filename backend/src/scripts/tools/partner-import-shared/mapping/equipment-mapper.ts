import type { ParsedPdpEquipmentOption } from '../listing-types';

const EQUIPMENT_SLUG_MAP: Record<string, string> = {
  // auto / safety / comfort
  '360_monitoring': 'camera_360',
  isofix_child_seat_attachment: 'isofix',
  abs: 'abs',
  air_conditioning: 'air_conditioning',
  all_season_tires: 'tires_all_season',
  alloy_wheels: 'alloy_wheels',
  antitheft_alarm: 'alarm_system',
  audio_system: 'premium_audio',
  automatic_climate: 'climate_control',
  board_computer: 'board_computer',
  central_locking: 'central_locking',
  cruise_control: 'cruise_control',
  curtain_airbags: 'curtain_airbags',
  driver_airbag: 'driver_airbag',
  electric_mirrors: 'electric_mirrors',
  electric_seats_driver: 'electric_seats_driver',
  electric_seats_passenger: 'electric_seats_passenger',
  electric_windows: 'electric_windows',
  fog_lights: 'fog_lights',
  headlight_washers: 'headlight_washers',
  heated_mirrors: 'heated_mirrors',
  heated_seats: 'heated_seats',
  immobilizer: 'immobilizer',
  laser_headlights: 'laser_headlights',
  leather_upholstery: 'leather_seats',
  led_headlights: 'led_lights',
  light_sensor: 'light_sensor',
  multifunctional_steering_wheel: 'multifunction_steering',
  navigation_system: 'navigation',
  panoramic_roof: 'panoramic_roof',
  parking_sensors: 'parking_sensors',
  passenger_airbag: 'passenger_airbag',
  power_steering: 'power_steering',
  rain_sensor: 'rain_sensor',
  rear_camera: 'rear_camera',
  seat_ventilation: 'ventilated_seats',
  side_airbags: 'side_airbags',
  stability_control: 'esp',
  steel_wheels: 'steel_wheels',
  steering_wheel_height_adjustment: 'steering_wheel_height_adjustment',
  steering_wheel_length_adjustment: 'steering_wheel_length_adjustment',
  summer_tires: 'tires_summer',
  sunroof: 'sunroof',
  textile_upholstery: 'textile_upholstery',
  tinted_windows: 'tinted_windows',
  tow_hook: 'tow_bar',
  traction_control: 'traction_control',
  upper_anchor_point: 'upper_anchor_point',
  velour_upholstery: 'velour_upholstery',
  winter_tires: 'tires_winter',
  xenon_headlights: 'xenon_lights',
};

const EQUIPMENT_MAP: Record<string, string> = {
  aerconditionat: 'air_conditioning',
  calculatordebord: 'board_computer',
  climaautomata: 'climate_control',
  cruisecontrol: 'cruise_control',
  geamurielectrice: 'electric_windows',
  geamuritonate: 'tinted_windows',
  lacatcentralizat: 'central_locking',
  oglinzicuincalzire: 'heated_mirrors',
  oglinzielectrice: 'electric_mirrors',
  scaunecuincalzire: 'heated_seats',
  scaunereglabileelectricpasager: 'electric_seats_passenger',
  scaunereglabileelectricsofer: 'electric_seats_driver',
  servodirectie: 'power_steering',
  sistemaudio: 'premium_audio',
  sistemdenavigaresistemtvdvd: 'navigation',
  tapiteriedinpiele: 'leather_seats',
  tapiteriedinvelur: 'velour_upholstery',
  volanreglabilpeinaltime: 'steering_wheel_height_adjustment',
  volanreglabilpelungime: 'steering_wheel_length_adjustment',
  acoperispanoramic: 'panoramic_roof',
  airbagpasager: 'passenger_airbag',
  airbagsofer: 'driver_airbag',
  airbaguriside: 'side_airbags',
  airbagurilaterale: 'side_airbags',
  airbaguriperdea: 'curtain_airbags',
  alarmaantifurt: 'alarm_system',
  cameraspate: 'rear_camera',
  farurianticeata: 'fog_lights',
  faruriled: 'led_lights',
  jantealiajusor: 'alloy_wheels',
  parctronic: 'parking_sensors',
  senzordelumina: 'light_sensor',
  senzordeploaie: 'rain_sensor',
  sistemantideraparetcsasrtrc: 'traction_control',
  sistemdeantiblocareafranelorabs: 'abs',
  sistemdemonitorizare360: 'camera_360',
  sistemdestabilizareespdscvdcesc: 'esp',
  volanmultifunctional: 'multifunction_steering',
  fixajisofixpentruscaunedecopii: 'isofix',
  punctdeancoraresuperiortoptether: 'upper_anchor_point',
  senzoriunghiurimoarte: 'blind_spot_monitor',
  senzorideparcare: 'parking_sensors',
  keylessgo: 'keyless_entry',
  portbajelelectric: 'electric_trunk',
  portbagajelectric: 'electric_trunk',
  suspensiepneumatica: 'air_suspension',
  softclose: 'soft_close_doors',

  // Missing / English variants from PLP option list
  boardcomputer: 'board_computer',
  centrallocking: 'central_locking',
  antitheftalarm: 'alarm_system',
  audiosystem: 'premium_audio',
  automaticclimate: 'climate_control',
  curtainairbags: 'curtain_airbags',
  driverairbag: 'driver_airbag',
  passengerairbag: 'passenger_airbag',
  sideairbags: 'side_airbags',
  electricmirrors: 'electric_mirrors',
  electricwindows: 'electric_windows',
  foglights: 'fog_lights',
  heatedmirrors: 'heated_mirrors',
  heatedseats: 'heated_seats',
  laserheadlights: 'laser_headlights',
  immobilizer: 'immobilizer',
  ledheadlights: 'led_lights',
  lightsensor: 'light_sensor',
  navigationsystem: 'navigation',
  parkingsensors: 'parking_sensors',
  panoramicroof: 'panoramic_roof',
  powersteering: 'power_steering',
  rearcamera: 'rear_camera',
  seatventilation: 'ventilated_seats',
  stabilitycontrol: 'esp',
  steelwheels: 'steel_wheels',
  upperanchorpoint: 'upper_anchor_point',
  textileupholstery: 'textile_upholstery',
  tintedwindows: 'tinted_windows',
  towhook: 'tow_bar',
  tractioncontrol: 'traction_control',
  velourupholstery: 'velour_upholstery',
  xenonheadlights: 'xenon_lights',

  isofixchildseatattachment: 'isofix',
  injectoarefaruri: 'headlight_washers',
  imobilizator: 'immobilizer',
  farurilaser: 'laser_headlights',
  sunroof: 'sunroof',
  multifunctionalsteeringwheel: 'multifunction_steering',
  tapiterietextila: 'textile_upholstery',
  carligderemorcare: 'tow_bar',
  janteotelstantate: 'steel_wheels',
  pneurivara: 'tires_summer',
  summertires: 'tires_summer',
  pneurialseason: 'tires_all_season',
  allseasontires: 'tires_all_season',
  pneuriiarna: 'tires_winter',
  wintertires: 'tires_winter',
  farurixenon: 'xenon_lights',
  trapasolara: 'sunroof',
  sistemantiblocareafranelorabs: 'abs',
  jantedinaliajusor: 'alloy_wheels',
  anvelopeallseason: 'tires_all_season',
  trapa: 'sunroof',
  sistemaudiobluetooth: 'premium_audio',
  ventilatieascaunelor: 'ventilated_seats',
  computerdebord: 'board_computer',
  sistemdenavigaretvdvd: 'navigation',
};

export function mapEquipmentOptions(options: ParsedPdpEquipmentOption[]): {
  equipmentKeys: string[];
  warnings: string[];
} {
  const equipment: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const option of options) {
    const slug = option.slug?.trim();
    const label = option.label;

    let mapped: string | undefined;
    if (slug) {
      mapped = EQUIPMENT_SLUG_MAP[normalizeSlug(slug)];
    }

    if (!mapped) {
      const normalized = normalize(label);
      mapped = EQUIPMENT_MAP[normalized];
    }

    if (!mapped) {
      if (slug) warnings.push(`UNMAPPED_EQUIPMENT_SLUG:${slug}`);
      else warnings.push(`UNMAPPED_EQUIPMENT_LABEL:${label}`);
      continue;
    }

    if (!seen.has(mapped)) {
      seen.add(mapped);
      equipment.push(mapped);
    }
  }

  return {
    equipmentKeys: equipment.slice(0, 40),
    warnings,
  };
}

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}
