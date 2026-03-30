jest.mock('@/lib/api', () => ({
  comparisonApi: {
    sync: jest.fn(),
    getIds: jest.fn(),
  },
  listingsApi: {
    getOne: jest.fn(),
  },
}));

import { comparisonApi } from '@/lib/api';
import { applyComparisonAfterAuth, loadComparisonFromApi } from '@/lib/comparisonMigration';
import { useComparisonStore } from '@/lib/store';

describe('loadComparisonFromApi after applyComparisonAfterAuth sync', () => {
  beforeEach(() => {
    localStorage.clear();
    useComparisonStore.getState().clear();
    jest.clearAllMocks();
    (comparisonApi.getIds as jest.Mock).mockResolvedValue({
      data: { vehicleListingIds: [], tireListingIds: [] },
    });
  });

  it('skips getIds once when sync succeeded', async () => {
    localStorage.setItem(
      'comparison-storage',
      JSON.stringify({ state: { vehicleComparisons: ['id-1'], tireComparisons: [] }, version: 0 }),
    );
    (comparisonApi.sync as jest.Mock).mockResolvedValue({
      data: { vehicleListingIds: ['id-1'], tireListingIds: [] },
    });

    await applyComparisonAfterAuth();
    await loadComparisonFromApi();

    expect(comparisonApi.sync).toHaveBeenCalledTimes(1);
    expect(comparisonApi.getIds).not.toHaveBeenCalled();
  });

  it('calls getIds when sync failed', async () => {
    localStorage.setItem(
      'comparison-storage',
      JSON.stringify({ state: { vehicleComparisons: ['id-1'], tireComparisons: [] }, version: 0 }),
    );
    (comparisonApi.sync as jest.Mock).mockRejectedValue(new Error('fail'));

    await applyComparisonAfterAuth();
    await loadComparisonFromApi();

    expect(comparisonApi.getIds).toHaveBeenCalledTimes(1);
  });

  it('calls getIds when applyComparisonAfterAuth had nothing to sync', async () => {
    await applyComparisonAfterAuth();
    await loadComparisonFromApi();

    expect(comparisonApi.sync).not.toHaveBeenCalled();
    expect(comparisonApi.getIds).toHaveBeenCalledTimes(1);
  });

  it('calls getIds on a second loadComparisonFromApi after a skipped run', async () => {
    localStorage.setItem(
      'comparison-storage',
      JSON.stringify({ state: { vehicleComparisons: ['id-1'], tireComparisons: [] }, version: 0 }),
    );
    (comparisonApi.sync as jest.Mock).mockResolvedValue({
      data: { vehicleListingIds: ['id-1'], tireListingIds: [] },
    });

    await applyComparisonAfterAuth();
    await loadComparisonFromApi();
    await loadComparisonFromApi();

    expect(comparisonApi.getIds).toHaveBeenCalledTimes(1);
  });
});
