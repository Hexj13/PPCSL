/**
 * @jest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { useEffect, useRef } from 'react';

import { SignPageContent } from './SignPageContent';

let scriptMountCount = 0;

jest.mock('next/script', () => ({
  __esModule: true,
  default: function MockScript({ onReady }: { onReady?: () => void }) {
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    useEffect(() => {
      scriptMountCount += 1;
      onReadyRef.current?.();
    }, []);
    return null;
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/ru/sign',
}));

jest.mock('@/app/login/LoginForm', () => ({
  LoginForm: () => null,
}));

jest.mock('@/app/register/RegisterPanel', () => ({
  RegisterPanel: () => null,
}));

jest.mock('@/app/login/useLoginPage', () => ({
  useLoginPage: () => ({
    isInitialized: true,
    user: null,
    t: (k: string) => k,
    formData: { login: '', password: '' },
    setFormData: jest.fn(),
    setErrors: jest.fn(),
    loading: false,
    errors: {},
    showPassword: false,
    setShowPassword: jest.fn(),
    handleFormFieldFocus: jest.fn(),
    handleLoginChange: jest.fn(),
    handleLoginBlur: jest.fn(),
    handleSubmit: jest.fn(),
    isRedirecting: false,
  }),
}));

jest.mock('@/app/register/useRegisterPage', () => ({
  useRegisterPage: () => ({
    formData: { type: 'Individual' },
  }),
}));

jest.mock('@/hooks/useTabIndicator', () => ({
  useTabIndicator: () => ({
    indicatorRef: { current: null },
    indicatorStyle: { left: 0, width: 0 },
  }),
}));

jest.mock('@/lib/analytics', () => ({
  analytics: { authTabSelect: jest.fn() },
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/providers/I18nProvider', () => ({
  useI18n: () => ({ locale: 'ru', isLoading: false }),
}));

describe('SignPageContent', () => {
  const originalClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    scriptMountCount = 0;
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-google-client';
    const initialize = jest.fn();
    const renderButton = jest.fn();
    window.google = {
      accounts: {
        id: {
          initialize,
          renderButton,
        },
      },
    };
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalClientId;
    delete window.google;
  });

  it('shows Google section and button after Script onReady on remount', async () => {
    const { unmount } = render(<SignPageContent />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-google-outside-card')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByTestId('auth-google-skeleton')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-google-block')).toBeInTheDocument();
    });
    expect(scriptMountCount).toBe(1);

    unmount();

    render(<SignPageContent />);

    await waitFor(() => {
      expect(screen.queryByTestId('auth-google-skeleton')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-google-block')).toBeInTheDocument();
    });
    expect(scriptMountCount).toBe(2);
  });

  it('shows skeleton before Google button is ready', () => {
    delete window.google;

    render(<SignPageContent />);

    expect(screen.getByTestId('auth-google-outside-card')).toBeInTheDocument();
    expect(screen.getByTestId('auth-google-skeleton')).toBeInTheDocument();
  });
});
