/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';

import { authApi } from '@/lib/api';

import { useLoginPage } from './useLoginPage';

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: () => ({
    replace: mockReplace,
    push: mockPush,
    href: (path: string) => path,
  }),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/auth-submit-loader', () => ({
  waitForAuthSubmitLoaderMinDisplay: jest.fn(async () => {}),
}));

jest.mock('@/lib/comparisonMigration', () => ({
  applyComparisonAfterAuth: jest.fn(),
  holdComparisonApiLoadUntilReleased: () => () => {},
}));

jest.mock('@/lib/sync-pending-favorites', () => ({
  syncPendingFavoritesAfterAuth: jest.fn(),
}));

jest.mock('@/lib/sync-partner-promo-dismiss', () => ({
  syncPartnerPromoDismissAfterAuth: jest.fn((u: unknown) => u),
}));

jest.mock('@/lib/browser-local-storage', () => ({
  localStorageGetItem: jest.fn(() => null),
  localStorageRemoveItem: jest.fn(),
}));

jest.mock('@/lib/analytics', () => ({
  analytics: {
    formStart: jest.fn(),
    formSubmit: jest.fn(),
    login: jest.fn(),
  },
}));

jest.mock('@/lib/toast', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

type UserSlice = { id: string; phoneVerified: boolean };

const authStoreState: {
  user: UserSlice | null;
  isInitialized: boolean;
  setAuth: jest.MockedFunction<(user: UserSlice | null) => void>;
} = {
  user: null,
  isInitialized: true,
  setAuth: jest.fn((user: UserSlice | null) => {
    authStoreState.user = user;
  }),
};

jest.mock('@/lib/store', () => {
  const useAuthStore = Object.assign(
    (sel?: (s: typeof authStoreState) => unknown) => {
      if (typeof sel === 'function') return sel(authStoreState);
      return authStoreState;
    },
    { getState: () => authStoreState },
  );
  return { useAuthStore };
});

jest.mock('@/lib/api', () => ({
  authApi: {
    login: jest.fn(),
    me: jest.fn(),
  },
  savedFiltersApi: {
    create: jest.fn(),
  },
}));

function lastReplacePath(): string {
  const calls = mockReplace.mock.calls;
  return String(calls[calls.length - 1]?.[0] ?? '');
}

const mockLogin = jest.mocked(authApi.login);
const mockMe = jest.mocked(authApi.me);

describe('useLoginPage post-auth navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authStoreState.user = null;
    authStoreState.isInitialized = true;
    authStoreState.setAuth.mockImplementation((user: UserSlice | null) => {
      authStoreState.user = user;
    });
    mockLogin.mockResolvedValue({} as never);
    mockMe.mockResolvedValue({
      data: { id: 'user-1', phoneVerified: true },
    } as never);
  });

  it('calls setAuth and replace to localized home when phone is verified and returnUrl is absent', async () => {
    const { result } = renderHook(() => useLoginPage());

    await act(async () => {
      result.current.setFormData({ login: 'user@example.com', password: 'Secret123!' });
    });

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent);
    });

    await waitFor(() => {
      expect(authStoreState.setAuth).toHaveBeenCalledWith({
        id: 'user-1',
        phoneVerified: true,
      });
      expect(lastReplacePath()).toBe('/');
    });
  });

  it('calls setAuth and replace to complete-profile when phone is not verified', async () => {
    mockMe.mockResolvedValue({
      data: { id: 'user-1', phoneVerified: false },
    } as never);

    const { result } = renderHook(() => useLoginPage());

    await act(async () => {
      result.current.setFormData({ login: 'user@example.com', password: 'Secret123!' });
    });

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent);
    });

    await waitFor(() => {
      expect(authStoreState.setAuth).toHaveBeenCalledWith({
        id: 'user-1',
        phoneVerified: false,
      });
      expect(lastReplacePath().includes('mode=phone_required')).toBe(true);
    });
  });

  it('does not auto-redirect when suppressSignedInReturnNavigation is true', async () => {
    authStoreState.user = { id: 'user-1', phoneVerified: true };

    renderHook(() => useLoginPage({ suppressSignedInReturnNavigation: true }));

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it('replaces to the provided returnUrl after verified login', async () => {
    const { result } = renderHook(() => useLoginPage({ returnUrl: '/favorites' }));

    await act(async () => {
      result.current.setFormData({ login: 'user@example.com', password: 'Secret123!' });
    });

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent);
    });

    await waitFor(() => {
      expect(lastReplacePath()).toBe('/favorites');
    });
  });
});
