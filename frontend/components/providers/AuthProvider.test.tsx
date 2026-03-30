import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { useAuthStore, useFavoritesStore } from '@/lib/store';

import { AuthProvider } from './AuthProvider';

jest.mock('@/lib/comparisonMigration', () => ({
  loadComparisonFromApi: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/store', () => {
  const mockRehydrate = jest.fn(() => Promise.resolve());
  const withPersist = (fn: ReturnType<typeof jest.fn>) => {
    Object.assign(fn, { persist: { rehydrate: mockRehydrate } });
    return fn;
  };
  return {
    useAuthStore: withPersist(jest.fn()),
    useFavoritesStore: withPersist(jest.fn()),
    useComparisonStore: withPersist(jest.fn()),
  };
});

describe('AuthProvider', () => {
  const mockInitAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({
          initAuth: mockInitAuth,
          user: null,
          isInitialized: true,
        });
      }
      return mockInitAuth;
    });
  });

  it('should call initAuth on mount', async () => {
    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>,
    );

    await waitFor(() => expect(mockInitAuth).toHaveBeenCalledTimes(1));
    const rehydrate = (useFavoritesStore as unknown as { persist: { rehydrate: jest.Mock } })
      .persist.rehydrate;
    expect(rehydrate).toHaveBeenCalledTimes(3);
  });

  it('should render children', () => {
    render(
      <AuthProvider>
        <div>Test Content</div>
      </AuthProvider>,
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should use initAuth from store', async () => {
    const mockInitAuthFromStore = jest.fn();
    (useAuthStore as unknown as jest.Mock).mockImplementation((sel) => {
      if (typeof sel === 'function') {
        return sel({
          initAuth: mockInitAuthFromStore,
          user: null,
          isInitialized: true,
        });
      }
      return mockInitAuthFromStore;
    });

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>,
    );

    await waitFor(() => expect(mockInitAuthFromStore).toHaveBeenCalledTimes(1));
  });
});
