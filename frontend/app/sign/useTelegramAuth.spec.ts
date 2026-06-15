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
    const popup = {
      closed: false,
      focus: jest.fn(),
    };
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => popup as unknown as Window);

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
      expect(openSpy).toHaveBeenCalled();
    });

    const authUrl = openSpy.mock.calls[0]?.[0];
    expect(authUrl).toContain('client_id=123456789');
    expect(authUrl).toContain('nonce=server-nonce');
    expect(authUrl).toContain('lang=ru');
    expect(authUrl).toContain(`origin=${encodeURIComponent(window.location.origin)}`);

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://oauth.telegram.org',
          source: popup as unknown as Window,
          data: JSON.stringify({ event: 'auth_result', result: 'oidc-token' }),
        }),
      );
    });

    await waitFor(() => {
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

    openSpy.mockRestore();
  });

  it('accepts Telegram auth_result with nested id_token', async () => {
    const popup = {
      closed: false,
      focus: jest.fn(),
    };
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => popup as unknown as Window);

    (authApi.createTelegramSignInNonce as jest.Mock).mockResolvedValue({
      data: { nonce: 'server-nonce' },
    });
    (authApi.telegramSignIn as jest.Mock).mockResolvedValue({
      data: { isNewUser: false, requiresPhoneVerification: false },
    });
    (authApi.me as jest.Mock).mockResolvedValue({ data: { id: 'user-1' } });

    const { result } = renderHook(() =>
      useTelegramAuth({
        tab: 'login',
        telegramScriptLoaded: true,
        locale: 'en',
      }),
    );

    await waitFor(() => expect(result.current.isLibraryReady).toBe(true));

    await act(async () => {
      result.current.signInWithTelegram();
    });

    await waitFor(() => expect(openSpy).toHaveBeenCalled());

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://oauth.telegram.org',
          source: popup as unknown as Window,
          data: { event: 'auth_result', result: { id_token: 'nested-oidc-token' } },
        }),
      );
    });

    await waitFor(() => {
      expect(authApi.telegramSignIn).toHaveBeenCalledWith(
        expect.objectContaining({
          idToken: 'nested-oidc-token',
          nonce: 'server-nonce',
          termsAccepted: true,
        }),
        expect.any(Object),
      );
    });

    openSpy.mockRestore();
  });
});
