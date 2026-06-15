import { renderHook, act, waitFor } from '@testing-library/react';

import { useTelegramAuth } from '@/app/sign/useTelegramAuth';
import { authApi } from '@/lib/api';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: () => ({ replace: jest.fn() }),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: (selector: (state: { setAuth: jest.Mock }) => unknown) =>
    selector({ setAuth: jest.fn() }),
}));

jest.mock('@/app/sign/finishOAuthSession', () => ({
  finishOAuthSession: jest.fn(),
}));

jest.mock('@/lib/toast', () => ({
  toast: { error: jest.fn() },
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    createTelegramSignInNonce: jest.fn(),
    telegramSignIn: jest.fn(),
    devTelegramSignIn: jest.fn(),
    me: jest.fn(),
  },
}));

describe('useTelegramAuth', () => {
  const originalClientId = process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID = '123456789';
    window.Telegram = {
      Login: {
        init: jest.fn(),
        auth: jest.fn((_options, callback) => {
          callback({ id_token: 'oidc-token' });
        }),
      },
    };
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID = originalClientId;
    process.env.NODE_ENV = originalNodeEnv;
    delete window.Telegram;
  });

  it('marks library ready when script is loaded', async () => {
    const { result } = renderHook(() =>
      useTelegramAuth({
        tab: 'login',
        telegramScriptLoaded: true,
        locale: 'en',
      }),
    );

    await waitFor(() => {
      expect(result.current.libraryStatus).toBe('ready');
    });
    expect(result.current.isLibraryReady).toBe(true);
  });

  it('requests nonce and signs in with id_token callback', async () => {
    (authApi.createTelegramSignInNonce as jest.Mock).mockResolvedValue({
      data: { nonce: 'server-nonce' },
    });
    (authApi.telegramSignIn as jest.Mock).mockResolvedValue({
      data: { isNewUser: true, requiresPhoneVerification: false },
    });
    (authApi.me as jest.Mock).mockResolvedValue({ data: { id: 'user-1' } });

    const { result } = renderHook(() =>
      useTelegramAuth({
        tab: 'register',
        preferredNewUserType: 'Business',
        telegramScriptLoaded: true,
        locale: 'ru',
      }),
    );

    await waitFor(() => expect(result.current.isLibraryReady).toBe(true));

    await act(async () => {
      result.current.signInWithTelegram();
    });

    await waitFor(() => {
      expect(authApi.createTelegramSignInNonce).toHaveBeenCalled();
      expect(window.Telegram?.Login?.auth).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 123456789,
          request_access: ['phone'],
          nonce: 'server-nonce',
          lang: 'ru',
        }),
        expect.any(Function),
      );
      expect(authApi.telegramSignIn).toHaveBeenCalledWith(
        expect.objectContaining({
          idToken: 'oidc-token',
          nonce: 'server-nonce',
          termsAccepted: true,
          type: 'Business',
        }),
        expect.any(Object),
      );
    });
  });
});
