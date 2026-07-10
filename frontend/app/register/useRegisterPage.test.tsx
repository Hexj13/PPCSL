/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';

import { authApi } from '@/lib/api';

import { useRegisterPage } from './useRegisterPage';

const mockPush = jest.fn();

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: () => ({
    replace: jest.fn(),
    push: mockPush,
    href: (path: string) => path,
  }),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/hooks/useApiErrorToast', () => ({
  useApiErrorToast: () => jest.fn(),
}));

jest.mock('@/lib/analytics', () => ({
  analytics: {
    formStart: jest.fn(),
    formSubmit: jest.fn(),
  },
}));

jest.mock('@/lib/pending-registration', () => ({
  savePendingRegistration: jest.fn(),
}));

jest.mock('@/lib/toast', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    sendSms: jest.fn(),
  },
}));

const mockSendSms = jest.mocked(authApi.sendSms);

describe('useRegisterPage submit guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends SMS only once when submit is triggered twice before resolution', async () => {
    let resolveSendSms: (value: unknown) => void = () => {};
    mockSendSms.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSendSms = resolve;
        }) as never,
    );

    const { result } = renderHook(() => useRegisterPage());

    act(() => {
      result.current.setFormData((prev) => ({
        ...prev,
        phone: '+37360000001',
        password: 'Password1!',
        termsAccepted: true,
      }));
    });

    const event = { preventDefault: jest.fn() } as unknown as React.FormEvent;

    await act(async () => {
      void result.current.handleSubmit(event);
      void result.current.handleSubmit(event);
    });

    expect(mockSendSms).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveSendSms({});
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/verify-phone');
    });
    expect(result.current.loading).toBe(true);
  });

  it('resets loading after SMS failure', async () => {
    mockSendSms.mockRejectedValueOnce({
      response: { data: { message: 'errors.phoneExists' } },
    } as never);

    const { result } = renderHook(() => useRegisterPage());

    act(() => {
      result.current.setFormData((prev) => ({
        ...prev,
        phone: '+37360000001',
        password: 'Password1!',
        termsAccepted: true,
      }));
    });

    const event = { preventDefault: jest.fn() } as unknown as React.FormEvent;

    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(result.current.loading).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
