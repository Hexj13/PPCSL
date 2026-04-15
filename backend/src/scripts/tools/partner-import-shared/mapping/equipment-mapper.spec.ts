import { mapEquipmentOptions } from './equipment-mapper';
import type { ParsedPdpEquipmentOption } from '../listing-types';

describe('equipment-mapper', () => {
  it('maps by slug (slug priority over label)', () => {
    const options: ParsedPdpEquipmentOption[] = [
      { slug: 'tow_hook', label: 'Cârlig de remorcare' },
    ];

    const result = mapEquipmentOptions(options);
    expect(result.equipmentKeys).toContain('tow_bar');
  });

  it('falls back to label normalization when slug missing', () => {
    const options: ParsedPdpEquipmentOption[] = [{ label: 'Imobilizator' }];

    const result = mapEquipmentOptions(options);
    expect(result.equipmentKeys).toContain('immobilizer');
  });

  it('warns on unknown slug', () => {
    const options: ParsedPdpEquipmentOption[] = [
      { slug: 'unknown_slug', label: 'Unknown feature' },
    ];

    const result = mapEquipmentOptions(options);
    expect(result.equipmentKeys).toHaveLength(0);
    expect(result.warnings).toContain('UNMAPPED_EQUIPMENT_SLUG:unknown_slug');
  });

  it('deduplicates mapped keys', () => {
    const options: ParsedPdpEquipmentOption[] = [
      { slug: 'abs', label: 'ABS' },
      { slug: 'abs', label: 'Sistem de antiblocare a frânelor (ABS)' },
    ];

    const result = mapEquipmentOptions(options);
    const count = result.equipmentKeys.filter((k) => k === 'abs').length;
    expect(count).toBe(1);
  });

  it('maps common 999.md PDP checklist labels (Romanian phrasing)', () => {
    const labels = [
      'Sistem antiblocare a frânelor (ABS)',
      'Jante din aliaj ușor',
      'Anvelope all-season',
      'Trapă',
      'Sistem audio, Bluetooth',
      'Ventilație a scaunelor',
      'Computer de bord',
      'Sistem de navigare, TV, DVD',
    ];
    const options: ParsedPdpEquipmentOption[] = labels.map((label) => ({ label }));
    const result = mapEquipmentOptions(options);
    expect(result.warnings).toEqual([]);
    expect(result.equipmentKeys).toEqual(
      expect.arrayContaining([
        'abs',
        'alloy_wheels',
        'tires_all_season',
        'sunroof',
        'premium_audio',
        'ventilated_seats',
        'board_computer',
        'navigation',
      ]),
    );
    expect(result.equipmentKeys).toHaveLength(8);
  });
});
