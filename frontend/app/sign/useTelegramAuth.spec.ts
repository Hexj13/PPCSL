import { renderHook, act, waitFor } from '@testing-library/react';

import {
  isTrustedTelegramMessageOrigin,
  isTrustedTelegramMessageSource,
  parseTelegramAuthMessage,
} from '@/app/sign/telegramAuthFlow';
import { useTelegramAuth } from '@/app/sign/useTelegramAuth';
import { authApi } from '@/lib/api';

jest.mock('@sentry/nextjs', () => ({
  addBreadcrumb: jest.fn(),
}));

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
    telegramSignIn: jest.fn(),
    devTelegramSignIn: jest.fn(),
    me: jest.fn(),
  },
}));

const widgetUser = {
  id: 123456789,
  first_name: 'John',
  username: 'johndoe',
  photo_url: 'https://t.me/photo.jpg',
  auth_date: 1700000000,
  hash: 'abc123def456',
};

describe('telegramAuthFlow helpers', () => {
  it('parses a Login Widget user payload', () => {
    expect(
      parseTelegramAuthMessage({
        event: 'auth_result',
        result: widgetUser,
      }),
    ).toEqual({ user: widgetUser });
  });

  it('parses a stringified Login Widget user payload', () => {
    expect(
      parseTelegramAuthMessage(
        JSON.stringify({
          event: 'auth_result',
          result: widgetUser,
        }),
      ),
    ).toEqual({ user: widgetUser });
  });

  it('ignores interim empty auth_result payloads', () => {
    expect(
      parseTelegramAuthMessage({
        event: 'auth_result',
        result: {},
      }),
    ).toBeNull();
  });

  it('parses auth_result errors nested in result', () => {
    expect(
      parseTelegramAuthMessage({
        event: 'auth_result',
        result: { error: 'access_denied' },
      }),
    ).toEqual({ error: 'access_denied' });
  });

  it('reports missing user data when the payload lacks id and hash', () => {
    expect(
      parseTelegramAuthMessage({
        event: 'auth_result',
        result: { status: 'pending' },
      }),
    ).toEqual({ error: 'missing user data' });
  });

  it('accepts oauth and same-origin message origins', () => {
    expect(
      isTrustedTelegramMessageOrigin('https://oauth.telegram.org', 'https://kupito.club'),
    ).toBe(true);
    expect(isTrustedTelegramMessageOrigin('https://kupito.club', 'https://kupito.club')).toBe(true);
    expect(isTrustedTelegramMessageOrigin('https://evil.example', 'https://kupito.club')).toBe(
      false,
    );
  });

  it('accepts same-origin messages even when source differs from popup', () => {
    const popup = { closed: false } as Window;
    const event = {
      origin: 'https://kupito.club',
      source: null,
    } as MessageEvent;

    expect(isTrustedTelegramMessageSource(event, popup, 'https://kupito.club')).toBe(true);
  });
});

describe('useTelegramAuth', () => {
  const originalClientId = process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID = '123456789';
    window.Telegram = {
      Login: {
        init: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID = originalClientId;
    process.env.NODE_ENV = originalNodeEnv;
    delete window.Telegram;
  });

  it('marks library ready when script is loaded', async () => {
    jest.useRealTimers();
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

  it('opens the widget popup and signs in with the Login Widget user', async () => {
    const popup = {
      closed: false,
      focus: jest.fn(),
    };
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => popup as unknown as Window);

    (authApi.telegramSignIn as jest.Mock).mockResolvedValue({
      data: { isNewUser: true, requiresPhoneVerification: true },
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

    await waitFor(() => expect(openSpy).toHaveBeenCalled());

    const authUrl = openSpy.mock.calls[0]?.[0];
    expect(authUrl).toContain('client_id=123456789');
    expect(authUrl).toContain('lang=ru');
    expect(authUrl).toContain(`origin=${encodeURIComponent(window.location.origin)}`);
    expect(authUrl).not.toContain('nonce=');

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://oauth.telegram.org',
          source: popup as unknown as Window,
          data: JSON.stringify({ event: 'auth_result', result: widgetUser }),
        }),
      );
    });

    await waitFor(() => {
      expect(authApi.telegramSignIn).toHaveBeenCalledWith(
        expect.objectContaining({
          id: widgetUser.id,
          hash: widgetUser.hash,
          auth_date: widgetUser.auth_date,
          username: widgetUser.username,
          termsAccepted: true,
          type: 'Business',
        }),
        expect.any(Object),
      );
    });

    openSpy.mockRestore();
  });

  it('accepts same-origin auth_result callback', async () => {
    const popup = {
      closed: false,
      focus: jest.fn(),
    };
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => popup as unknown as Window);

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
          origin: window.location.origin,
          source: popup as unknown as Window,
          data: JSON.stringify({ event: 'auth_result', result: widgetUser }),
        }),
      );
    });

    await waitFor(() => {
      expect(authApi.telegramSignIn).toHaveBeenCalledWith(
        expect.objectContaining({ id: widgetUser.id, hash: widgetUser.hash }),
        expect.any(Object),
      );
    });

    openSpy.mockRestore();
  });

  it('does not call backend when auth_result has no user data', async () => {
    const popup = {
      closed: false,
      focus: jest.fn(),
    };
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => popup as unknown as Window);

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
          data: { event: 'auth_result', result: { status: 'pending' } },
        }),
      );
    });

    await waitFor(() => {
      expect(authApi.telegramSignIn).not.toHaveBeenCalled();
    });

    openSpy.mockRestore();
  });

  it('ignores messages from untrusted origins', async () => {
    const popup = {
      closed: false,
      focus: jest.fn(),
    };
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => popup as unknown as Window);

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
          origin: 'https://evil.example',
          source: popup as unknown as Window,
          data: JSON.stringify({ event: 'auth_result', result: widgetUser }),
        }),
      );
    });

    expect(authApi.telegramSignIn).not.toHaveBeenCalled();

    openSpy.mockRestore();
  });

  it('opens the manual popup with an explicit origin even when SDK auth exists', async () => {
    const authSpy = jest.fn();
    const popup = {
      closed: false,
      focus: jest.fn(),
    };
    window.Telegram = {
      Login: {
        init: jest.fn(),
        auth: authSpy,
      },
    };
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => popup as unknown as Window);

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

    const authUrl = openSpy.mock.calls[0]?.[0];
    expect(authUrl).toContain(`origin=${encodeURIComponent(window.location.origin)}`);
    expect(authSpy).not.toHaveBeenCalled();

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://oauth.telegram.org',
          source: popup as unknown as Window,
          data: JSON.stringify({ event: 'auth_result', result: widgetUser }),
        }),
      );
    });

    await waitFor(() => {
      expect(authApi.telegramSignIn).toHaveBeenCalledWith(
        expect.objectContaining({ id: widgetUser.id, hash: widgetUser.hash }),
        expect.any(Object),
      );
    });

    openSpy.mockRestore();
  });
});
