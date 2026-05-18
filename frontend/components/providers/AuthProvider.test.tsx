import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { useAuthStore } from '@/lib/store';

import { AuthProvider } from './AuthProvider';

jest.mock('@/lib/comparisonMigration', () => ({
  loadComparisonFromApi: jest.fn(() => Promise.resolve()),
}));

var rehydrateMocks: {
  auth: jest.Mock;
  favorites: jest.Mock;
  comparison: jest.Mock;
};

jest.mock('@/lib/store', () => {
  const auth = jest.fn(() => Promise.resolve());
  const favorites = jest.fn(() => Promise.resolve());
  const comparison = jest.fn(() => Promise.resolve());
  rehydrateMocks = { auth, favorites, comparison };
  const withPersist = (fn: ReturnType<typeof jest.fn>, rehydrate: jest.Mock) => {
    Object.assign(fn, { persist: { rehydrate } });
    return fn;
  };
  return {
    useAuthStore: withPersist(jest.fn(), auth),
    useFavoritesStore: withPersist(jest.fn(), favorites),
    useComparisonStore: withPersist(jest.fn(), comparison),
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
    expect(rehydrateMocks.auth).toHaveBeenCalledTimes(1);
    expect(rehydrateMocks.favorites).toHaveBeenCalledTimes(1);
    expect(rehydrateMocks.comparison).toHaveBeenCalledTimes(1);
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

  it('should rehydrate auth and call initAuth when auth-storage changes from another tab', async () => {
    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>,
    );

    await waitFor(() => expect(mockInitAuth).toHaveBeenCalledTimes(1));
    expect(rehydrateMocks.auth).toHaveBeenCalledTimes(1);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'auth-storage',
        newValue: '{}',
        storageArea: localStorage,
      }),
    );

    await waitFor(() => expect(rehydrateMocks.auth).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockInitAuth).toHaveBeenCalledTimes(2));
  });

  it('should not rehydrate auth when legacy token storage key changes from another tab', async () => {
    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>,
    );

    await waitFor(() => expect(mockInitAuth).toHaveBeenCalledTimes(1));

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'token',
        newValue: 'new-token',
        storageArea: localStorage,
      }),
    );

    await waitFor(() => expect(rehydrateMocks.auth).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockInitAuth).toHaveBeenCalledTimes(1));
  });
});
