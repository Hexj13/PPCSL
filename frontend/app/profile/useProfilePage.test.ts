/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useProfilePage } from '@/app/profile/useProfilePage';
import { authApi } from '@/lib/api';

const mockPush = jest.fn();

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: () => ({
    push: mockPush,
  }),
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

jest.mock('@/lib/toast', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  type: 'Individual',
  phone: '+37360000000',
} as const;

const mockLogout = jest.fn();

const authStoreState: {
  user: typeof mockUser | null;
  isInitialized: boolean;
  setAuth: jest.MockedFunction<(user: typeof mockUser | null) => void>;
  logout: jest.MockedFunction<() => void>;
} = {
  user: mockUser,
  isInitialized: true,
  setAuth: jest.fn((user: typeof mockUser | null) => {
    authStoreState.user = user;
  }),
  logout: mockLogout,
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
    me: jest.fn(),
    deleteAccount: jest.fn(),
    updateProfile: jest.fn(),
    changeEmailRequest: jest.fn(),
    changePassword: jest.fn(),
  },
}));

describe('useProfilePage handleDeleteAccount', () => {
  let locationHref = '';
  const locationAssign = jest.fn((value: string) => {
    locationHref = value;
  });
  const locationReplace = jest.fn((value: string) => {
    locationHref = value;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    locationHref = '';
    authStoreState.user = mockUser;
    authStoreState.isInitialized = true;
    mockLogout.mockImplementation(() => {
      authStoreState.user = null;
    });
    (authApi.me as jest.Mock).mockResolvedValue({ data: mockUser });
    (authApi.deleteAccount as jest.Mock).mockResolvedValue({ data: { success: true } });

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/ru/profile',
        get href() {
          return locationHref;
        },
        set href(value: string) {
          locationHref = value;
        },
        assign: locationAssign,
        replace: locationReplace,
      },
    });
  });

  it('calls deleteAccount, logout, and redirects to home on success', async () => {
    const { result } = renderHook(() => useProfilePage());

    await waitFor(() => {
      expect(authApi.me).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.handleDeleteAccount();
    });

    expect(authApi.deleteAccount).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
    expect(locationReplace).toHaveBeenCalledWith('/ru');
    expect(locationHref).toBe('/ru');
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('sign'));
  });
});
import { getProfileSubmitState } from './useProfilePage';

describe('getProfileSubmitState', () => {
  const baseUser = {
    id: 'user-1',
    email: null,
    type: 'Individual' as const,
    phone: '+37370123456',
    firstName: 'Test',
    lastName: 'User',
    companyName: null,
    companyWebsiteUrl: null,
    additionalPhone: null,
    emailNotifications: false,
    emailNotificationListingRefreshReminders: false,
    emailNotificationWeeklyViewsDigest: false,
    emailNotificationSecurityAlerts: false,
    viber: false,
    whatsapp: false,
    telegram: false,
    emailVerified: null,
  };

  it('detects email change when input differs from current user email', () => {
    const result = getProfileSubmitState(
      baseUser,
      {
        firstName: 'Test',
        lastName: 'User',
        companyName: '',
        companyWebsiteUrl: '',
        additionalPhone: '',
        emailNotifications: false,
        emailNotificationListingRefreshReminders: false,
        emailNotificationWeeklyViewsDigest: false,
        emailNotificationSecurityAlerts: false,
        viber: false,
        whatsapp: false,
        telegram: false,
      },
      'new@example.com',
      '',
      '',
    );

    expect(result.hasEmailChange).toBe(true);
  });

  it('does not detect email change when input matches current unverified email', () => {
    const result = getProfileSubmitState(
      {
        ...baseUser,
        email: 'new@example.com',
        emailVerified: false,
      },
      {
        firstName: 'Test',
        lastName: 'User',
        companyName: '',
        companyWebsiteUrl: '',
        additionalPhone: '',
        emailNotifications: false,
        emailNotificationListingRefreshReminders: false,
        emailNotificationWeeklyViewsDigest: false,
        emailNotificationSecurityAlerts: false,
        viber: false,
        whatsapp: false,
        telegram: false,
      },
      'new@example.com',
      '',
      '',
    );

    expect(result.hasEmailChange).toBe(false);
  });
});
