import {
  mergeComparisonSourcesFromLocalStorage,
  mergeIdLists,
  parseComparisonStorageBuckets,
} from '@/lib/comparisonMigration';
import { useComparisonStore } from '@/lib/store';

describe('mergeIdLists', () => {
  it('concatenates primary then secondary with dedupe and cap', () => {
    expect(mergeIdLists(['a'], ['b', 'a'], 3)).toEqual(['a', 'b']);
  });
});

describe('parseComparisonStorageBuckets', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps up to three vehicles and three tires separately', () => {
    localStorage.setItem(
      'comparison-storage',
      JSON.stringify({
        state: {
          vehicleComparisons: ['v1', 'v2', 'v3', 'v4'],
          tireComparisons: ['t1', 't2', 't3', 't4'],
        },
        version: 0,
      }),
    );
    expect(parseComparisonStorageBuckets()).toEqual({
      vehicleListingIds: ['v1', 'v2', 'v3'],
      tireListingIds: ['t1', 't2', 't3'],
    });
  });
});

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
