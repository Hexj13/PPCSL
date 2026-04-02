import { FuelType, TransmissionType } from '../../../../common/types';

import { mapFuel, mapTransmission } from './enum-mapper';

describe('mapFuel', () => {
  it('maps 999.md fuel labels used for vehicle imports', () => {
    expect(mapFuel('Electricitate').value).toBe(FuelType.Electric);
    expect(mapFuel('Gaz / Benzină (metan)').value).toBe(FuelType.LPG);
    expect(mapFuel('Gaz / Benzină (propan)').value).toBe(FuelType.LPG);
    expect(mapFuel('Mild Hybrid (benzină)').value).toBe(FuelType.MHEV);
    expect(mapFuel('Mild Hybrid (diesel)').value).toBe(FuelType.MHEV);
    expect(mapFuel('Plug-in Hybrid (benzină)').value).toBe(FuelType.PHEV);
    expect(mapFuel('Plug-in Hybrid (diesel)').value).toBe(FuelType.PHEV);
  });

  it('returns warning for unknown fuel label', () => {
    const r = mapFuel('Quantum fuel');
    expect(r.value).toBeUndefined();
    expect(r.warning).toBe('UNMAPPED_FUEL:Quantum fuel');
  });
});

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
