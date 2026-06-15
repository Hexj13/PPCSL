/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen, waitFor } from '@testing-library/react';

import {
  getOverlayHistoryStackSizeForTests,
  resetOverlayHistoryForTests,
  triggerOverlayPopStateForTests,
} from '@/lib/overlay-history';

import { CompleteProfilePhoneGate } from './CompleteProfilePhoneGate';

const mockReplace = jest.fn();
const mockLogout = jest.fn();
const mockDeleteAccount = jest.fn().mockResolvedValue({ data: { success: true } });
let searchParamsValue = 'mode=phone_required';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/app/register/RegisterFormMessengers', () => ({
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
    user: {
      id: 'user-1',
      email: 'user@example.com',
      type: 'Individual',
      phoneVerified: false,
      hasPassword: false,
    },
    logout: mockLogout,
  }),
}));

describe('CompleteProfilePhoneGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchParamsValue = 'mode=phone_required';
    sessionStorage.clear();
    resetOverlayHistoryForTests();
    const pushState = jest.fn();
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: {
        state: null,
        pushState,
        back: jest.fn(),
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
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('/sign'));
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

  it('deletes the half-created account when the signup source is present', async () => {
    searchParamsValue = 'mode=phone_required&source=telegram_register';
    render(<CompleteProfilePhoneGate />);

    await act(async () => {
      triggerOverlayPopStateForTests();
    });

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    });
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
