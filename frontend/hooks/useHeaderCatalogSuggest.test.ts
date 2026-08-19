import { act, renderHook, waitFor } from '@testing-library/react';

import { brandsApi } from '@/lib/api';

import { useHeaderCatalogSuggest } from './useHeaderCatalogSuggest';

jest.mock('@/lib/api', () => ({
  brandsApi: {
    suggest: jest.fn(),
  },
}));

const suggestMock = brandsApi.suggest as jest.MockedFunction<typeof brandsApi.suggest>;

describe('useHeaderCatalogSuggest', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    suggestMock.mockReset();
    suggestMock.mockResolvedValue({
      data: { items: [] },
    } as Awaited<ReturnType<typeof brandsApi.suggest>>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call the API for fewer than 3 letters or digits', () => {
    renderHook(() => useHeaderCatalogSuggest('fo'));
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(suggestMock).not.toHaveBeenCalled();
  });

  it('does not call the API when the query exceeds 64 characters', () => {
    renderHook(() => useHeaderCatalogSuggest('a'.repeat(65)));
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(suggestMock).not.toHaveBeenCalled();
  });

  it('calls the API after debounce when the query is long enough', async () => {
    renderHook(() => useHeaderCatalogSuggest('ford'));
    expect(suggestMock).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(200);
    });
    await waitFor(() => {
      expect(suggestMock).toHaveBeenCalledTimes(1);
    });
  });
});
