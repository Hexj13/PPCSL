import AsyncStorage from '@react-native-async-storage/async-storage';

import { comparisonStore, MAX_COMPARE } from './comparisonStore';

describe('comparisonStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('adds vehicle up to MAX_COMPARE', async () => {
    for (let i = 0; i < MAX_COMPARE; i++) {
      expect(await comparisonStore.addVehicle(`v${i}`)).toBe(true);
    }
    expect(await comparisonStore.addVehicle('overflow')).toBe(false);
  });

  it('removes vehicle id', async () => {
    await comparisonStore.addVehicle('a');
    await comparisonStore.removeVehicle('a');
    const data = await comparisonStore.read();
    expect(data.vehicleComparisons).toEqual([]);
  });
});
