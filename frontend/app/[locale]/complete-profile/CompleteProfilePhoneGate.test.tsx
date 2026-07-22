/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { saveOAuthPhoneRequiredContext } from '@/lib/oauth-phone-required-context';
import {
  getOverlayHistoryStackSizeForTests,
  resetOverlayHistoryForTests,
  triggerOverlayPopStateForTests,
} from '@/lib/overlay-history';

import { CompleteProfilePhoneGate } from './CompleteProfilePhoneGate';

const mockReplace = jest.fn();
const mockRouterReplace = jest.fn();
const mockLogout = jest.fn();
const mockDeleteAccount = jest.fn().mockResolvedValue({ data: { success: true } });
let searchParamsValue = 'mode=phone_required';
let mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  type: 'Individual' as const,
  phoneVerified: false,
  hasPassword: false,
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockRouterReplace, push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}));

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: () => ({
    replace: mockReplace,
    push: jest.fn(),
    href: (path: string) => path,
  }),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/app/[locale]/register/RegisterFormMessengers', () => ({
  RegisterFormMessengers: () => null,
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    updateProfile: jest.fn(),
    me: jest.fn(),
    sendSms: jest.fn(),
    deleteAccount: () => mockDeleteAccount(),
  },
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}));

describe('CompleteProfilePhoneGate', () => {
  let historyBack: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    searchParamsValue = 'mode=phone_required';
    mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      type: 'Individual',
      phoneVerified: false,
      hasPassword: false,
    };
    sessionStorage.clear();
    resetOverlayHistoryForTests();
    historyBack = jest.fn();
    const pushState = jest.fn();
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: {
        state: null,
        pushState,
        back: historyBack,
      },
    });
  });

  afterEach(() => {
    resetOverlayHistoryForTests();
  });

  it('logs out and redirects to sign when the user navigates back', async () => {
    render(<CompleteProfilePhoneGate />);

    expect(getOverlayHistoryStackSizeForTests()).toBe(1);

    await act(async () => {
      triggerOverlayPopStateForTests();
    });

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
    expect(mockRouterReplace).toHaveBeenCalledWith(expect.stringContaining('/sign'));
    expect(historyBack).not.toHaveBeenCalled();
  });

  it('logs out and redirects to sign when the back button is clicked', async () => {
    render(<CompleteProfilePhoneGate />);

    fireEvent.click(screen.getByTestId('complete-profile-phone-required-back'));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
    expect(mockRouterReplace).toHaveBeenCalledWith(expect.stringContaining('/sign'));
    expect(historyBack).not.toHaveBeenCalled();
  });

  it('shows back for OAuth signup without source query param', () => {
    render(<CompleteProfilePhoneGate />);
    expect(screen.getByTestId('complete-profile-phone-required-back')).toBeTruthy();
  });

  it('does not delete an existing account when no signup signal is present', async () => {
    render(<CompleteProfilePhoneGate />);

    await act(async () => {
      triggerOverlayPopStateForTests();
    });

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('does not delete the account when only the signup source query is present', async () => {
    searchParamsValue = 'mode=phone_required&source=telegram_register';
    render(<CompleteProfilePhoneGate />);

    await act(async () => {
      triggerOverlayPopStateForTests();
    });

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('deletes the half-created account when the signup context is present', async () => {
    searchParamsValue = 'mode=phone_required&source=telegram_register';
    saveOAuthPhoneRequiredContext({ source: 'telegram_register' });
    render(<CompleteProfilePhoneGate />);

    await act(async () => {
      triggerOverlayPopStateForTests();
    });

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    });
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('redirects OAuth signup users with verified phone to complete-profile', async () => {
    searchParamsValue = 'mode=phone_required&source=google_register&returnUrl=%2Ffavorites';
    mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      type: 'Individual',
      phoneVerified: true,
      hasPassword: false,
    };
    saveOAuthPhoneRequiredContext({ source: 'google_register' });

    render(<CompleteProfilePhoneGate />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/complete-profile?returnUrl=%2Ffavorites');
    });
  });

  it('redirects OAuth signup users with verified phone from session context to complete-profile', async () => {
    searchParamsValue = 'mode=phone_required&returnUrl=%2Ffavorites';
    mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      type: 'Individual',
      phoneVerified: true,
      hasPassword: false,
    };
    saveOAuthPhoneRequiredContext({ source: 'google_register' });

    render(<CompleteProfilePhoneGate />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/complete-profile?returnUrl=%2Ffavorites');
    });
  });

  it('redirects existing users with verified phone to home when returnUrl is absent', async () => {
    mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      type: 'Individual',
      phoneVerified: true,
      hasPassword: true,
    };

    render(<CompleteProfilePhoneGate />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });
});
