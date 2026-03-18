import { FuelType } from '../../../../common/types';

import { estimateHorsepower } from './hp-estimator';

describe('hp-estimator', () => {
  it('uses horsepowerFromPdp as a primary source', () => {
    const result = estimateHorsepower({
      horsepowerFromPdp: 130,
      description: 'Some text 75 cp',
      engineVolumeL: 1.2,
      fuel: FuelType.Petrol,
      defaultHorsepower: 150,
    });

    expect(result.horsepower).toBe(130);
    expect(result.estimated).toBe(false);
  });

  it('falls back to description horsepower when horsepowerFromPdp is missing', () => {
    const result = estimateHorsepower({
      horsepowerFromPdp: undefined,
      description: 'Putere motor 130 cp',
      engineVolumeL: 1.2,
      fuel: FuelType.Petrol,
      defaultHorsepower: 150,
    });

    expect(result.horsepower).toBe(130);
    expect(result.estimated).toBe(false);
  });

  it('estimates horsepower from engine volume when no text/pdp horsepower exists', () => {
    const result = estimateHorsepower({
      horsepowerFromPdp: undefined,
      description: 'No horsepower here',
      engineVolumeL: 1,
      fuel: FuelType.Petrol,
      defaultHorsepower: 150,
    });

    expect(result.horsepower).toBe(75);
    expect(result.estimated).toBe(true);
  });
});
