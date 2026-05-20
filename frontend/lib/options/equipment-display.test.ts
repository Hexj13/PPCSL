import { buildListingEquipmentDisplay, shouldGroupListingEquipment } from './equipment-display';

const mockT = (key: string): string => {
  const labels: Record<string, string> = {
    'vehicleOptions.equipment.air_conditioning': 'Air conditioning',
    'vehicleOptions.equipment.climate_control': 'Climate control',
    'vehicleOptions.equipment.heated_seats': 'Heated seats',
    'vehicleOptions.equipment.leather_seats': 'Leather seats',
    'vehicleOptions.equipment.central_locking': 'Central locking',
    'vehicleOptions.equipment.electric_windows': 'Electric windows',
    'vehicleOptions.equipment.keyless_entry': 'Keyless entry',
    'vehicleOptions.equipment.keyless_ignition': 'Keyless ignition',
    'vehicleOptions.equipment.heated_steering': 'Heated steering',
    'vehicleOptions.equipment.board_computer': 'Board computer',
    'vehicleOptions.equipment.abs': 'ABS',
    'vehicleOptions.equipment.esp': 'ESP',
    'vehicleOptions.equipment.driver_airbag': 'Driver airbag',
    'vehicleOptions.equipment.bluetooth': 'Bluetooth',
    'vehicleOptions.equipment.navigation': 'Navigation',
    'vehicleOptions.equipment.apple_carplay': 'Apple CarPlay',
    'vehicleOptions.equipment.android_auto': 'Android Auto',
    'vehicleOptions.equipment.premium_audio': 'Premium audio',
    'vehicleOptions.equipment.xenon_lights': 'Xenon lights',
    'vehicleOptions.equipment.led_lights': 'LED lights',
    'vehicleOptions.equipment.fog_lights': 'Fog lights',
  };
  return labels[key] ?? key;
};

const comfortKeys = [
  'air_conditioning',
  'climate_control',
  'heated_seats',
  'leather_seats',
  'central_locking',
  'electric_windows',
  'keyless_entry',
  'keyless_ignition',
];

const safetyKeys = ['abs', 'esp', 'driver_airbag'];

const multimediaKeys = [
  'bluetooth',
  'navigation',
  'apple_carplay',
  'android_auto',
  'premium_audio',
];

describe('shouldGroupListingEquipment', () => {
  it('returns false when fewer than 10 items even with three categories', () => {
    const keys = [...comfortKeys.slice(0, 3), ...safetyKeys, ...multimediaKeys.slice(0, 3)];
    expect(keys.length).toBe(9);
    expect(shouldGroupListingEquipment(keys)).toBe(false);
  });

  it('returns false when only two categories are represented', () => {
    const keys = [...comfortKeys, ...safetyKeys];
    expect(keys.length).toBeGreaterThanOrEqual(10);
    expect(shouldGroupListingEquipment(keys)).toBe(false);
  });

  it('returns true when at least 10 items span at least three categories', () => {
    const keys = [...comfortKeys, ...safetyKeys, ...multimediaKeys];
    expect(keys.length).toBeGreaterThanOrEqual(10);
    expect(shouldGroupListingEquipment(keys)).toBe(true);
  });
});

describe('buildListingEquipmentDisplay', () => {
  it('returns flat mode with alphabetically sorted columns for small sets', () => {
    const keys = ['heated_seats', 'abs', 'bluetooth'];
    const display = buildListingEquipmentDisplay(keys, mockT);

    expect(display.mode).toBe('flat');
    if (display.mode !== 'flat') return;

    expect(display.left).toEqual(['abs', 'bluetooth']);
    expect(display.right).toEqual(['heated_seats']);
  });

  it('returns empty flat columns when no equipment keys', () => {
    const display = buildListingEquipmentDisplay([], mockT);

    expect(display).toEqual({ mode: 'flat', left: [], right: [] });
  });

  it('returns grouped mode with category order from EQUIPMENT_CATEGORIES', () => {
    const keys = [...comfortKeys, ...safetyKeys, ...multimediaKeys];
    const display = buildListingEquipmentDisplay(keys, mockT);

    expect(display.mode).toBe('grouped');
    if (display.mode !== 'grouped') return;

    expect(display.groups.map((g) => g.category)).toEqual(['comfort', 'multimedia', 'safety']);
  });

  it('splits three items per category into two and one column entries', () => {
    const keys = ['abs', 'esp', 'driver_airbag'];
    const display = buildListingEquipmentDisplay(keys, mockT);

    expect(display.mode).toBe('flat');
    if (display.mode !== 'flat') return;

    expect(display.left).toEqual(['abs', 'driver_airbag']);
    expect(display.right).toEqual(['esp']);
  });

  it('sorts items within each grouped category by translated label', () => {
    const keys = [...comfortKeys, ...safetyKeys, ...multimediaKeys];
    const display = buildListingEquipmentDisplay(keys, mockT);

    expect(display.mode).toBe('grouped');
    if (display.mode !== 'grouped') return;

    const safetyGroup = display.groups.find((g) => g.category === 'safety');
    expect(safetyGroup?.left).toEqual(['abs', 'driver_airbag']);
    expect(safetyGroup?.right).toEqual(['esp']);
  });
});
