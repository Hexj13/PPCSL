import { mergeComparisonSourcesFromLocalStorage } from '@/lib/comparisonMigration';
import { useComparisonStore } from '@/lib/store';

describe('mergeComparisonSourcesFromLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('orders pending first, dedupes, and caps at three ids', () => {
    localStorage.setItem('pendingComparisons', JSON.stringify(['c', 'a']));
    localStorage.setItem(
      'comparison-storage',
      JSON.stringify({ state: { comparisons: ['a', 'b', 'd'] }, version: 0 }),
    );
    expect(mergeComparisonSourcesFromLocalStorage()).toEqual(['c', 'a', 'b']);
  });

  it('returns storage ids when pending is empty', () => {
    localStorage.setItem(
      'comparison-storage',
      JSON.stringify({ state: { comparisons: ['x', 'y'] }, version: 0 }),
    );
    expect(mergeComparisonSourcesFromLocalStorage()).toEqual(['x', 'y']);
  });

  it('returns an empty array when there are no sources', () => {
    expect(mergeComparisonSourcesFromLocalStorage()).toEqual([]);
  });
});

describe('useComparisonStore setVehicleComparisons', () => {
  beforeEach(() => {
    localStorage.removeItem('comparison-storage');
    useComparisonStore.getState().clear();
  });

  it('dedupes ids and keeps at most three', () => {
    useComparisonStore.getState().setVehicleComparisons(['a', 'b', 'a', 'c', 'd']);
    expect(useComparisonStore.getState().vehicleComparisons).toEqual(['a', 'b', 'c']);
  });
});
