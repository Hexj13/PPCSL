/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

import { useHeaderState } from './useHeaderState';

const mockLogout = jest.fn();
const mockUsePathname = jest.fn(() => '/ru/profile');
const mockUseAuthStore = jest.fn(() => ({
  user: { id: 'user-1' },
  logout: mockLogout,
  isInitialized: true,
}));

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('@/lib/i18n', () => ({
  getClientLocale: () => 'ru',
}));

jest.mock('@/lib/post-auth-redirect', () => ({
  buildPostAuthRedirect: (target: string, locale: string) =>
    `/${locale}${target === '/' ? '' : target}`,
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

describe('useHeaderState handleLogout', () => {
  let locationHref = '';

  beforeEach(() => {
    jest.clearAllMocks();
    locationHref = '';
    mockUsePathname.mockReturnValue('/ru/profile');
    mockUseAuthStore.mockReturnValue({
      user: { id: 'user-1' },
      logout: mockLogout,
      isInitialized: true,
    });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        get href() {
          return locationHref;
        },
        set href(value: string) {
          locationHref = value;
        },
      },
    });
    document.body.innerHTML = '';
  });

  it('redirects to localized home when logging out from an auth-required page', () => {
    const { result } = renderHook(() => useHeaderState());

    act(() => {
      result.current.handleLogout();
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(locationHref).toBe('/ru');
  });

  it('does not redirect when logging out from a public page', () => {
    mockUsePathname.mockReturnValue('/ru/listings');
    const { result } = renderHook(() => useHeaderState());

    act(() => {
      result.current.handleLogout();
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(locationHref).toBe('');
  });
});

describe('useHeaderState showSkeleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
    document.body.innerHTML = '';
  });

  it('shows skeleton while auth is not initialized even with rehydrated user', () => {
    mockUseAuthStore.mockReturnValue({
      user: { id: 'user-1' },
      logout: mockLogout,
      isInitialized: false,
    });

    const { result } = renderHook(() => useHeaderState());

    expect(result.current.showSkeleton).toBe(true);
  });

  it('hides skeleton after auth initialization', () => {
    mockUseAuthStore.mockReturnValue({
      user: { id: 'user-1' },
      logout: mockLogout,
      isInitialized: true,
    });

    const { result } = renderHook(() => useHeaderState());

    expect(result.current.showSkeleton).toBe(false);
  });

  it('shows skeleton for guest before auth initialization', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      logout: mockLogout,
      isInitialized: false,
    });

    const { result } = renderHook(() => useHeaderState());

    expect(result.current.showSkeleton).toBe(true);
  });
});
