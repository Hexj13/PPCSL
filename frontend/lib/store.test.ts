import { renderHook, act } from '@testing-library/react';

import { authApi, User } from './api';
import { useAuthStore, useFavoritesStore, useComparisonStore } from './store';

jest.mock('./api', () => ({
  authApi: {
    me: jest.fn(),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      isInitialized: false,
    });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isInitialized).toBe(false);
  });

  it('should set auth and save token to localStorage', () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser: User = {
      id: 'user-1',
      email: 'test@example.com',
      type: 'Individual',
    };
    const token = 'test-token';

    act(() => {
      result.current.setAuth(mockUser, token);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(token);
    expect(result.current.isInitialized).toBe(true);
    expect(localStorage.getItem('token')).toBe(token);
  });

  it('should logout and clear localStorage', () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser: User = {
      id: 'user-1',
      email: 'test@example.com',
      type: 'Individual',
    };

    act(() => {
      result.current.setAuth(mockUser, 'test-token');
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isInitialized).toBe(true);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('pendingFavorites')).toBeNull();
    expect(localStorage.getItem('pendingComparisons')).toBeNull();
    expect(localStorage.getItem('returnUrl')).toBeNull();
  });

  it('should initAuth with valid token', async () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser: User = {
      id: 'user-1',
      email: 'test@example.com',
      type: 'Individual',
    };

    (authApi.me as jest.Mock).mockResolvedValue({ data: mockUser });

    act(() => {
      result.current.setAuth(null, 'valid-token');
    });

    await act(async () => {
      await result.current.initAuth();
    });

    expect(authApi.me).toHaveBeenCalled();
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isInitialized).toBe(true);
  });

  it('should logout on initAuth failure', async () => {
    const { result } = renderHook(() => useAuthStore());

    (authApi.me as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

    act(() => {
      result.current.setAuth(null, 'invalid-token');
    });

    await act(async () => {
      await result.current.initAuth();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isInitialized).toBe(true);
  });

  it('should set isInitialized to true when no token', async () => {
    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.initAuth();
    });

    expect(result.current.isInitialized).toBe(true);
    expect(result.current.user).toBeNull();
  });
});

describe('useFavoritesStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useFavoritesStore.setState({
      favorites: [],
    });
  });

  it('should initialize with empty favorites', () => {
    const { result } = renderHook(() => useFavoritesStore());

    expect(result.current.favorites).toEqual([]);
  });

  it('should add favorite', () => {
    const { result } = renderHook(() => useFavoritesStore());

    act(() => {
      result.current.add('listing-1');
    });

    expect(result.current.favorites).toContain('listing-1');
  });

  it('should remove favorite', () => {
    const { result } = renderHook(() => useFavoritesStore());

    act(() => {
      result.current.add('listing-1');
      result.current.add('listing-2');
    });

    act(() => {
      result.current.remove('listing-1');
    });

    expect(result.current.favorites).not.toContain('listing-1');
    expect(result.current.favorites).toContain('listing-2');
  });

  it('should check if favorite exists', () => {
    const { result } = renderHook(() => useFavoritesStore());

    act(() => {
      result.current.add('listing-1');
    });

    expect(result.current.check('listing-1')).toBe(true);
    expect(result.current.check('listing-2')).toBe(false);
  });

  it('should set favorites', () => {
    const { result } = renderHook(() => useFavoritesStore());

    act(() => {
      result.current.setFavorites(['listing-1', 'listing-2', 'listing-3']);
    });

    expect(result.current.favorites).toEqual(['listing-1', 'listing-2', 'listing-3']);
  });

  it('should clear favorites', () => {
    const { result } = renderHook(() => useFavoritesStore());

    act(() => {
      result.current.add('listing-1');
      result.current.add('listing-2');
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.favorites).toEqual([]);
  });
});

describe('useComparisonStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useComparisonStore.setState({
      comparisons: [],
    });
  });

  it('should initialize with empty comparisons', () => {
    const { result } = renderHook(() => useComparisonStore());

    expect(result.current.comparisons).toEqual([]);
    expect(result.current.count()).toBe(0);
  });

  it('should add comparison', () => {
    const { result } = renderHook(() => useComparisonStore());

    act(() => {
      const added = result.current.add('listing-1');
      expect(added).toBe(true);
    });

    expect(result.current.comparisons).toContain('listing-1');
    expect(result.current.count()).toBe(1);
  });

  it('should not add duplicate comparison', () => {
    const { result } = renderHook(() => useComparisonStore());

    act(() => {
      result.current.add('listing-1');
    });

    act(() => {
      const added = result.current.add('listing-1');
      expect(added).toBe(false);
    });

    expect(result.current.comparisons).toEqual(['listing-1']);
    expect(result.current.count()).toBe(1);
  });

  it('should enforce maximum of 3 comparisons', () => {
    const { result } = renderHook(() => useComparisonStore());

    act(() => {
      result.current.add('listing-1');
      result.current.add('listing-2');
      result.current.add('listing-3');
    });

    expect(result.current.count()).toBe(3);

    act(() => {
      const added = result.current.add('listing-4');
      expect(added).toBe(false);
    });

    expect(result.current.comparisons).toHaveLength(3);
    expect(result.current.comparisons).not.toContain('listing-4');
    expect(result.current.count()).toBe(3);
  });

  it('should remove comparison', () => {
    const { result } = renderHook(() => useComparisonStore());

    act(() => {
      result.current.add('listing-1');
      result.current.add('listing-2');
      result.current.add('listing-3');
    });

    act(() => {
      result.current.remove('listing-2');
    });

    expect(result.current.comparisons).not.toContain('listing-2');
    expect(result.current.comparisons).toContain('listing-1');
    expect(result.current.comparisons).toContain('listing-3');
    expect(result.current.count()).toBe(2);
  });

  it('should check if comparison exists', () => {
    const { result } = renderHook(() => useComparisonStore());

    act(() => {
      result.current.add('listing-1');
    });

    expect(result.current.check('listing-1')).toBe(true);
    expect(result.current.check('listing-2')).toBe(false);
  });

  it('should clear all comparisons', () => {
    const { result } = renderHook(() => useComparisonStore());

    act(() => {
      result.current.add('listing-1');
      result.current.add('listing-2');
      result.current.add('listing-3');
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.comparisons).toEqual([]);
    expect(result.current.count()).toBe(0);
  });

  it('should persist comparisons to localStorage', () => {
    const { result } = renderHook(() => useComparisonStore());

    act(() => {
      result.current.add('listing-1');
      result.current.add('listing-2');
    });

    const stored = localStorage.getItem('comparison-storage');
    expect(stored).toBeTruthy();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.comparisons).toEqual(['listing-1', 'listing-2']);
    }
  });

  it('should be cleared on logout', () => {
    const { result: authResult } = renderHook(() => useAuthStore());
    const { result: comparisonResult } = renderHook(() => useComparisonStore());
    const mockUser: User = {
      id: 'user-1',
      email: 'test@example.com',
      type: 'Individual',
    };

    act(() => {
      authResult.current.setAuth(mockUser, 'test-token');
      comparisonResult.current.add('listing-1');
      comparisonResult.current.add('listing-2');
    });

    expect(comparisonResult.current.count()).toBe(2);

    act(() => {
      authResult.current.logout();
    });

    expect(comparisonResult.current.comparisons).toEqual([]);
    expect(comparisonResult.current.count()).toBe(0);
  });
});
