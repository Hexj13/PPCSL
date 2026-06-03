/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react';

import {
  getOverlayHistoryStackSizeForTests,
  resetOverlayHistoryForTests,
  triggerOverlayPopStateForTests,
} from '@/lib/overlay-history';

import { CompleteProfilePhoneGate } from './CompleteProfilePhoneGate';

const mockReplace = jest.fn();
const mockLogout = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  useSearchParams: () => new URLSearchParams('mode=phone_required'),
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
  },
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-1',
      email: 'user@example.com',
      type: 'Individual',
      phoneVerified: false,
    },
    logout: mockLogout,
  }),
}));

describe('CompleteProfilePhoneGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('logs out and redirects to sign when the user navigates back', () => {
    render(<CompleteProfilePhoneGate />);

    expect(getOverlayHistoryStackSizeForTests()).toBe(1);

    act(() => {
      triggerOverlayPopStateForTests();
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('/sign'));
  });
});
