import type { ParsedPdpEquipmentOption } from '../../partner-import-shared/listing-types';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

const LABEL_TO_SLUG: Record<string, string> = {
  abs: 'abs',
  esp: 'stability_control',
  airbagsofer: 'driver_airbag',
  airbagpasager: 'passenger_airbag',
  airbagurilaterale: 'side_airbags',
  airbaguriperdea: 'curtain_airbags',
  aerconditionat: 'air_conditioning',
  climaautomata: 'automatic_climate',
  cruisecontrol: 'cruise_control',
  geamurielectrice: 'electric_windows',
  oglinzicuincalzire: 'heated_mirrors',
  oglinzielectrice: 'electric_mirrors',
  faruriled: 'led_headlights',
  farurixenon: 'xenon_headlights',
  cameraspate: 'rear_camera',
  senzorideparcare: 'parking_sensors',
  parctronic: 'parking_sensors',
  navigatie: 'navigation_system',
  sistemdenavigare: 'navigation_system',
  incalzirescaune: 'heated_seats',
  scaunecuincalzire: 'heated_seats',
  piele: 'leather_upholstery',
  tapiteriedinpiele: 'leather_upholstery',
  trapadesoare: 'sunroof',
  trappanoramic: 'panoramic_roof',
  acoperispanoramic: 'panoramic_roof',
  bluetooth: 'audio_system',
  usb: 'audio_system',
  aux: 'audio_system',
  incalzirevolan: 'multifunctional_steering_wheel',
  volanmultifunctional: 'multifunctional_steering_wheel',
  senzorploaie: 'rain_sensor',
  senzordelumina: 'light_sensor',
  startstop: 'board_computer',
  keyless: 'central_locking',
  lacatcentralizat: 'central_locking',
  imobilizator: 'immobilizer',
  alarma: 'antitheft_alarm',
  alarmaantifurt: 'antitheft_alarm',
  controltractiune: 'traction_control',
  distributieelectronicacuplaj: 'traction_control',
  jantealiaj: 'alloy_wheels',
  jantealiajusor: 'alloy_wheels',
  anvelopeiarna: 'winter_tires',
  anvelopevara: 'summer_tires',
  geamuritonate: 'tinted_windows',
  servodirectie: 'power_steering',
  isofix: 'isofix_child_seat_attachment',
  fixajisofix: 'isofix_child_seat_attachment',
};

export function map999mdCheckboxToEquipmentOption(title: string): ParsedPdpEquipmentOption {
  const label = title.trim();
  const slug = LABEL_TO_SLUG[normalize(label)];
  return slug ? { slug, label } : { label };
}
