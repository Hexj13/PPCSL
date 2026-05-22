/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

import { useHeaderState } from './useHeaderState';

const mockLogout = jest.fn();
const mockUsePathname = jest.fn(() => '/ru/profile');

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
  useAuthStore: () => ({
    user: { id: 'user-1' },
    logout: mockLogout,
    isInitialized: true,
  }),
}));

describe('useHeaderState handleLogout', () => {
  let locationHref = '';

  beforeEach(() => {
    jest.clearAllMocks();
    locationHref = '';
    mockUsePathname.mockReturnValue('/ru/profile');
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
