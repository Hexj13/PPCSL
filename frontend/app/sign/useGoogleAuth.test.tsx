/**
 * @jest-environment jsdom
 */

const mockPathname = jest.fn(() => '/ru/sign');

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen, waitFor } from '@testing-library/react';

import { I18nProvider } from '@/components/providers/I18nProvider';
import { authApi } from '@/lib/api';
import { loadTranslationsDynamic, type Translations } from '@/lib/i18n';
import { toast } from '@/lib/toast';

import { useGoogleAuth } from './useGoogleAuth';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => mockPathname(),
}));

jest.mock('@/lib/comparisonMigration', () => ({
  applyComparisonAfterAuth: jest.fn(),
  holdComparisonApiLoadUntilReleased: () => () => {},
}));

jest.mock('@/lib/sync-pending-favorites', () => ({
  syncPendingFavoritesAfterAuth: jest.fn(),
}));

jest.mock('@/lib/sync-partner-promo-dismiss', () => ({
  syncPartnerPromoDismissAfterAuth: jest.fn((u: unknown) => u),
}));

jest.mock('@/lib/toast', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    googleSignIn: jest.fn(async () => undefined),
    me: jest.fn(async () => ({ data: { id: '1', phoneVerified: true } })),
  },
}));

const authStoreState: {
  user: { id: string; phoneVerified: boolean };
  setAuth: jest.Mock;
} = {
  user: { id: '1', phoneVerified: true },
  setAuth: jest.fn((u: { id: string; phoneVerified: boolean }) => {
    authStoreState.user = u;
  }),
};

jest.mock('@/lib/store', () => {
  const useAuthStore = Object.assign(
    (sel: (s: typeof authStoreState) => unknown) => sel(authStoreState),
    { getState: () => authStoreState },
  );
  return { useAuthStore };
});

jest.mock('@/lib/i18n', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- jest.requireActual module shape
  const actual = jest.requireActual<typeof import('@/lib/i18n')>('@/lib/i18n');
  return {
    ...actual,
    loadTranslationsDynamic: jest.fn(actual.loadTranslationsDynamic),
  };
});

const minimalTranslations = {
  register: { termsRequired: 'terms' },
  errors: { googleSignInFailed: 'fail' },
  common: { loading: 'Loading' },
} as unknown as Translations;

function HarnessRegisterBusiness() {
  const { containerRef, isGoogleAuthInFlight } = useGoogleAuth({
    mode: 'register',
    userType: 'Business',
  });
  return (
    <>
      <div ref={containerRef} data-testid="gis-root" />
      <span data-testid="google-auth-in-flight">{isGoogleAuthInFlight ? 'true' : 'false'}</span>
    </>
  );
}

function Harness() {
  const { containerRef, isGoogleAuthInFlight } = useGoogleAuth({ mode: 'login' });
  return (
    <>
      <div ref={containerRef} data-testid="gis-root" />
      <span data-testid="google-auth-in-flight">{isGoogleAuthInFlight ? 'true' : 'false'}</span>
    </>
  );
}

function Tree({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider initialLocale="ru" initialTranslations={minimalTranslations}>
      {children}
    </I18nProvider>
  );
}

describe('useGoogleAuth', () => {
  const originalClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const originalSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-google-client';
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
    jest.clearAllMocks();
    (authApi.googleSignIn as jest.Mock).mockImplementation(async () => undefined);
    authStoreState.user = { id: '1', phoneVerified: true };
    authStoreState.setAuth.mockImplementation((u: { id: string; phoneVerified: boolean }) => {
      authStoreState.user = u;
    });
    (authApi.me as jest.Mock).mockResolvedValue({ data: { id: '1', phoneVerified: true } });
    mockPathname.mockReturnValue('/ru/sign');
    delete (window as unknown as { location?: unknown }).location;
    (window as unknown as { location: Location }).location = {
      pathname: '/ru/sign',
    } as Location;
    (loadTranslationsDynamic as jest.Mock).mockImplementation((locale: unknown) =>
      Promise.resolve({ ...minimalTranslations, __locale: String(locale) } as Translations),
    );
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
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = originalSwitcher;
    delete window.google;
  });

  it('re-renders GIS button with new locale when app locale changes', async () => {
    const { rerender } = render(
      <Tree>
        <Harness />
      </Tree>,
    );

    await waitFor(() => {
      expect(window.google?.accounts?.id.renderButton).toHaveBeenCalled();
    });

    const renderButton = window.google!.accounts!.id.renderButton as jest.Mock;
    expect(renderButton.mock.calls.at(-1)?.[1]).toEqual(
      expect.objectContaining({ locale: 'ru_RU' }),
    );

    mockPathname.mockReturnValue('/sign');
    window.location.pathname = '/sign';

    rerender(
      <Tree>
        <Harness />
      </Tree>,
    );

    await waitFor(() => {
      const last = renderButton.mock.calls.at(-1)?.[1];
      expect(last).toEqual(expect.objectContaining({ locale: 'ro_RO' }));
    });
  });

  it('redirects to phone_required with Google register markers when phone is not verified', async () => {
    let href = '';
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/ru/sign',
        set href(next: string) {
          href = next;
        },
        get href() {
          return href;
        },
      },
    });

    (authApi.me as jest.Mock).mockResolvedValue({ data: { id: '1', phoneVerified: false } });

    render(
      <Tree>
        <HarnessRegisterBusiness />
      </Tree>,
    );

    await waitFor(() => {
      expect(window.google?.accounts?.id.initialize).toHaveBeenCalled();
    });

    const init = (window.google!.accounts!.id.initialize as jest.Mock).mock.calls[0][0] as {
      callback: (resp: { credential: string }) => void;
    };

    await act(async () => {
      await init.callback({ credential: 'tok' });
    });

    await waitFor(() => {
      expect(
        href.includes('mode=phone_required') &&
          href.includes('source=google_register') &&
          href.includes('selectedType=Business'),
      ).toBe(true);
    });
  });

  it('sets isGoogleAuthInFlight true before googleSignIn resolves', async () => {
    let resolveGoogleSignIn: (value?: unknown) => void = () => {};
    (authApi.googleSignIn as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGoogleSignIn = resolve;
        }),
    );

    let href = '';
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/ru/sign',
        set href(next: string) {
          href = next;
        },
        get href() {
          return href;
        },
      },
    });

    render(
      <Tree>
        <Harness />
      </Tree>,
    );

    await waitFor(() => {
      expect(window.google?.accounts?.id.initialize).toHaveBeenCalled();
    });

    const init = (window.google!.accounts!.id.initialize as jest.Mock).mock.calls[0][0] as {
      callback: (resp: { credential: string }) => void;
    };

    void act(() => {
      void init.callback({ credential: 'tok' });
    });

    await waitFor(() => {
      expect(screen.getByTestId('google-auth-in-flight')).toHaveTextContent('true');
    });

    await act(async () => {
      resolveGoogleSignIn(undefined);
    });

    await waitFor(() => {
      expect(href.length).toBeGreaterThan(0);
    });
  });

  it('redirects to localized home when phone is verified and returnUrl is absent', async () => {
    let href = '';
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/ru/sign',
        set href(next: string) {
          href = next;
        },
        get href() {
          return href;
        },
      },
    });

    render(
      <Tree>
        <Harness />
      </Tree>,
    );

    await waitFor(() => {
      expect(window.google?.accounts?.id.initialize).toHaveBeenCalled();
    });

    const init = (window.google!.accounts!.id.initialize as jest.Mock).mock.calls[0][0] as {
      callback: (resp: { credential: string }) => void;
    };

    await act(async () => {
      await init.callback({ credential: 'tok' });
    });

    await waitFor(() => {
      expect(href === '/ru' || href.endsWith('/ru')).toBe(true);
    });
  });

  it('clears isGoogleAuthInFlight and shows toast when googleSignIn fails', async () => {
    (authApi.googleSignIn as jest.Mock).mockRejectedValueOnce(new Error('network'));

    render(
      <Tree>
        <Harness />
      </Tree>,
    );

    await waitFor(() => {
      expect(window.google?.accounts?.id.initialize).toHaveBeenCalled();
    });

    const init = (window.google!.accounts!.id.initialize as jest.Mock).mock.calls[0][0] as {
      callback: (resp: { credential: string }) => void;
    };

    await act(async () => {
      await init.callback({ credential: 'tok' });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('fail');
    });

    expect(screen.getByTestId('google-auth-in-flight')).toHaveTextContent('false');
  });
});
