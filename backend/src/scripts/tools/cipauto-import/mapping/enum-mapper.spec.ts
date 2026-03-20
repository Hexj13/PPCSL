import { TransmissionType } from '../../../../common/types';

import { mapTransmission } from './enum-mapper';

describe('mapTransmission', () => {
  it('maps 999.md Cutia de viteze labels (Romanian)', () => {
    expect(mapTransmission('Mecanică').value).toBe(TransmissionType.Manual);
    expect(mapTransmission('Automată').value).toBe(TransmissionType.Automatic);
    expect(mapTransmission('Automat-Tiptronic').value).toBe(TransmissionType.Automatic);
    expect(mapTransmission('Semiautomată').value).toBe(TransmissionType.Automatic);
    expect(mapTransmission('Variator').value).toBe(TransmissionType.CVT);
    expect(mapTransmission('Robotizată').value).toBe(TransmissionType.Robot);
  });

  it('returns warning for unknown gearbox label', () => {
    const r = mapTransmission('Quantum gearbox');
    expect(r.value).toBeUndefined();
    expect(r.warning).toBe('UNMAPPED_TRANSMISSION:Quantum gearbox');
  });
});
