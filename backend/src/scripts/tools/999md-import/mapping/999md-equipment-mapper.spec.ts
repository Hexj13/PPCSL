import { mapEquipmentOptions } from '../../cipauto-import/mapping/equipment-mapper';

import { map999mdCheckboxToEquipmentOption } from './999md-equipment-mapper';

describe('map999mdCheckboxToEquipmentOption + mapEquipmentOptions', () => {
  it('maps 999 label slugs through CipAuto EQUIPMENT_SLUG_MAP keys', () => {
    const labels = [
      'ESP',
      'Navigație',
      'Bluetooth',
      'ISOFIX',
      'Anvelope iarnă',
      'Anvelope vară',
      'Piele',
    ];
    const options = labels.map((title) => map999mdCheckboxToEquipmentOption(title));
    const { equipmentKeys, warnings } = mapEquipmentOptions(options);
    expect(warnings).toEqual([]);
    expect(equipmentKeys).toEqual(
      expect.arrayContaining([
        'esp',
        'navigation',
        'premium_audio',
        'isofix',
        'tires_winter',
        'tires_summer',
        'leather_seats',
      ]),
    );
    expect(equipmentKeys.length).toBeLessThanOrEqual(40);
  });
});
