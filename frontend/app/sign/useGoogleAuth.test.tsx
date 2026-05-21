/**
 * @jest-environment jsdom
 */

const mockPathname = jest.fn(() => '/ru/sign');

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { I18nProvider } from '@/components/providers/I18nProvider';
import { authApi } from '@/lib/api';
import { loadTranslationsDynamic, type Translations } from '@/lib/i18n';
import { toast } from '@/lib/toast';

import { useGoogleAuth } from './useGoogleAuth';

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    href: (path: string) => path,
  }),
}));

jest.mock('@/lib/auth-submit-loader', () => ({
  waitForAuthSubmitLoaderMinDisplay: jest.fn(async () => {}),
  AUTH_SUBMIT_LOADER_MIN_MS: 2000,
}));

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
    googleSignIn: jest.fn(async (..._args: unknown[]) => undefined),
    me: jest.fn(async (..._args: unknown[]) => ({ data: { id: '1', phoneVerified: true } })),
  },
}));

type AuthUserSlice = { id: string; phoneVerified: boolean };
type AuthMeSnapshot = { data: AuthUserSlice };
type GoogleSignInFnMock = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
type AuthMeFnMock = jest.MockedFunction<(...args: unknown[]) => Promise<AuthMeSnapshot>>;

const authStoreState: {
  user: AuthUserSlice;
  setAuth: jest.MockedFunction<(...args: unknown[]) => void>;
} = {
  user: { id: '1', phoneVerified: true },
  setAuth: jest.fn((...args: unknown[]) => {
    authStoreState.user = args[0] as AuthUserSlice;
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
  const { containerRef, isGoogleAuthInFlight, isGoogleBusy } = useGoogleAuth({
    mode: 'register',
    userType: 'Business',
  });
  return (
    <>
      <div ref={containerRef} data-testid="gis-root" />
      <span data-testid="google-auth-in-flight">{isGoogleAuthInFlight ? 'true' : 'false'}</span>
      <span data-testid="google-auth-busy">{isGoogleBusy ? 'true' : 'false'}</span>
    </>
  );
}

function HarnessWithMode({
  mode,
  userType,
}: {
  mode: 'login' | 'register';
  userType?: 'Business' | 'Individual';
}) {
  const { containerRef } = useGoogleAuth({ mode, userType });
  return <div ref={containerRef} data-testid="gis-root" />;
}

function Harness() {
  const { containerRef, isGoogleAuthInFlight, isGoogleBusy, markGoogleSignInIntent } =
    useGoogleAuth({ mode: 'login' });
  return (
    <>
      <div ref={containerRef} data-testid="gis-root" />
      <button type="button" data-testid="mark-google-intent" onClick={markGoogleSignInIntent}>
        intent
      </button>
      <span data-testid="google-auth-in-flight">{isGoogleAuthInFlight ? 'true' : 'false'}</span>
      <span data-testid="google-auth-busy">{isGoogleBusy ? 'true' : 'false'}</span>
    </>
  );
}

function HarnessGisLoaded({ loaded }: { loaded: boolean }) {
  const { containerRef, isButtonReady } = useGoogleAuth({
    mode: 'login',
    gisScriptLoaded: loaded,
  });
  return (
    <>
      <div ref={containerRef} data-testid="gis-root" />
      <span data-testid="button-ready">{isButtonReady ? 'true' : 'false'}</span>
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
    (authApi.googleSignIn as unknown as GoogleSignInFnMock).mockImplementation(
      async () => undefined,
    );
    authStoreState.user = { id: '1', phoneVerified: true };
    authStoreState.setAuth.mockImplementation((...args: unknown[]) => {
      authStoreState.user = args[0] as AuthUserSlice;
    });
    (authApi.me as unknown as AuthMeFnMock).mockResolvedValue({
      data: { id: '1', phoneVerified: true },
    });
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

  it('returns isButtonReady false when gisScriptLoaded is false', () => {
    render(
      <Tree>
        <HarnessGisLoaded loaded={false} />
      </Tree>,
    );

    expect(screen.getByTestId('button-ready')).toHaveTextContent('false');
    expect(window.google?.accounts?.id.initialize).not.toHaveBeenCalled();
  });

  it('returns isButtonReady true and renders GIS button when gisScriptLoaded is true', async () => {
    render(
      <Tree>
        <HarnessGisLoaded loaded={true} />
      </Tree>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('button-ready')).toHaveTextContent('true');
    });
    expect(window.google?.accounts?.id.initialize).toHaveBeenCalled();
    expect(window.google?.accounts?.id.renderButton).toHaveBeenCalled();
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

    (authApi.me as unknown as AuthMeFnMock).mockResolvedValue({
      data: { id: '1', phoneVerified: false },
    });

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

  it('uses latest mode and user type in the one-time GIS callback', async () => {
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

    (authApi.me as unknown as AuthMeFnMock).mockResolvedValue({
      data: { id: '1', phoneVerified: false },
    });

    const { rerender } = render(
      <Tree>
        <HarnessWithMode mode="login" />
      </Tree>,
    );

    await waitFor(() => {
      expect(window.google?.accounts?.id.initialize).toHaveBeenCalledTimes(1);
    });

    const init = (window.google!.accounts!.id.initialize as jest.Mock).mock.calls[0][0] as {
      callback: (resp: { credential: string }) => void;
    };

    rerender(
      <Tree>
        <HarnessWithMode mode="register" userType="Business" />
      </Tree>,
    );

    await act(async () => {
      await init.callback({ credential: 'tok' });
    });

    expect(authApi.googleSignIn).toHaveBeenCalledWith({
      idToken: 'tok',
      termsAccepted: true,
      type: 'Business',
    });
    await waitFor(() => {
      expect(
        href.includes('mode=phone_required') &&
          href.includes('source=google_register') &&
          href.includes('selectedType=Business'),
      ).toBe(true);
    });
  });

  it('sets isGoogleBusy true before googleSignIn resolves', async () => {
    let resolveGoogleSignIn: (value?: unknown) => void = () => {};
    (authApi.googleSignIn as unknown as GoogleSignInFnMock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGoogleSignIn = resolve;
        }),
    );

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
      expect(screen.getByTestId('google-auth-busy')).toHaveTextContent('true');
    });

    let assignedHref = '';
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/ru/sign',
        set href(next: string) {
          assignedHref = next;
        },
        get href() {
          return assignedHref;
        },
      },
    });

    await act(async () => {
      resolveGoogleSignIn(undefined);
    });

    await waitFor(() => {
      expect(assignedHref).toBe('/ru');
    });
  });

  it('sets isGooglePopupPending on window blur when Google sign-in intent is marked', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    render(
      <Tree>
        <Harness />
      </Tree>,
    );

    await waitFor(() => {
      expect(window.google?.accounts?.id.initialize).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByTestId('mark-google-intent'));
    await act(async () => {
      window.dispatchEvent(new Event('blur'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('google-auth-busy')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('google-auth-in-flight')).toHaveTextContent('false');
  });

  it('ignores blur without Google sign-in intent or focused GIS iframe', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    render(
      <Tree>
        <Harness />
      </Tree>,
    );

    await waitFor(() => {
      expect(window.google?.accounts?.id.initialize).toHaveBeenCalled();
    });

    await act(async () => {
      window.dispatchEvent(new Event('blur'));
    });

    expect(screen.getByTestId('google-auth-busy')).toHaveTextContent('false');
  });

  it('does not set isGooglePopupPending on blur when tab is hidden', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });

    render(
      <Tree>
        <Harness />
      </Tree>,
    );

    await waitFor(() => {
      expect(window.google?.accounts?.id.initialize).toHaveBeenCalled();
    });

    await act(async () => {
      window.dispatchEvent(new Event('blur'));
    });

    expect(screen.getByTestId('google-auth-busy')).toHaveTextContent('false');
  });

  it('ignores callback without credential', async () => {
    render(
      <Tree>
        <Harness />
      </Tree>,
    );

    await waitFor(() => {
      expect(window.google?.accounts?.id.initialize).toHaveBeenCalled();
    });

    const init = (window.google!.accounts!.id.initialize as jest.Mock).mock.calls[0][0] as {
      callback: (resp: { credential?: string }) => void;
    };

    await act(async () => {
      await init.callback({});
    });

    expect(authApi.googleSignIn).not.toHaveBeenCalled();
    expect(screen.getByTestId('google-auth-busy')).toHaveTextContent('false');
  });

  it('hard-redirects to localized home when phone is verified and returnUrl is absent', async () => {
    let assignedHref = '';
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/ru/sign',
        set href(next: string) {
          assignedHref = next;
        },
        get href() {
          return assignedHref;
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
      expect(assignedHref).toBe('/ru');
    });
  });

  it('clears isGoogleAuthInFlight and shows toast when googleSignIn fails', async () => {
    (authApi.googleSignIn as unknown as GoogleSignInFnMock).mockRejectedValueOnce(
      new Error('network'),
    );

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
