/**
 * @jest-environment jsdom
 */

const mockPathname = jest.fn(() => '/ru/sign');
let mockSearchParams = new URLSearchParams();
const mockLocalStorageGetItem = jest.fn(() => null as string | null);
const mockLocalStorageRemoveItem = jest.fn();
const mockLocationReplace = jest.fn();

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { I18nProvider } from '@/components/providers/I18nProvider';
import { authApi, savedFiltersApi } from '@/lib/api';
import { loadTranslationsDynamic, type Translations } from '@/lib/i18n';
import { toast } from '@/lib/toast';

import { useGoogleAuth, resetGisInitStateForTests } from './useGoogleAuth';

const mockReplace = jest.fn();

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: () => ({
    replace: mockReplace,
    push: jest.fn(),
    href: (path: string) => path,
  }),
}));

jest.mock('@/lib/auth-submit-loader', () => ({
  waitForAuthSubmitLoaderMinDisplay: jest.fn(async () => {}),
  AUTH_SUBMIT_LOADER_MIN_MS: 2000,
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  usePathname: () => mockPathname(),
}));

jest.mock('@/lib/browser-local-storage', () => ({
  localStorageGetItem: (...args: unknown[]) => mockLocalStorageGetItem(...args),
  localStorageRemoveItem: (...args: unknown[]) => mockLocalStorageRemoveItem(...args),
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

const mockAnalyticsLogin = jest.fn();
const mockAnalyticsSignUp = jest.fn();

jest.mock('@/lib/analytics', () => ({
  analytics: {
    login: (...args: unknown[]) => mockAnalyticsLogin(...args),
    signUp: (...args: unknown[]) => mockAnalyticsSignUp(...args),
  },
}));

type GoogleSignInResponseSlice = {
  isNewUser: boolean;
  requiresPhoneVerification: boolean;
  user: { id: string };
};

jest.mock('@/lib/api', () => ({
  authApi: {
    googleSignIn: jest.fn(async (..._args: unknown[]) => ({
      data: {
        isNewUser: false,
        requiresPhoneVerification: false,
        user: { id: '1' },
      },
    })),
    me: jest.fn(async (..._args: unknown[]) => ({ data: { id: '1', phoneVerified: true } })),
  },
  savedFiltersApi: {
    create: jest.fn(async () => ({})),
  },
}));

type AuthUserSlice = { id: string; phoneVerified: boolean; type?: string };
type AuthMeSnapshot = { data: AuthUserSlice };
type GoogleSignInFnMock = jest.MockedFunction<
  (...args: unknown[]) => Promise<{ data: GoogleSignInResponseSlice }>
>;
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

function lastReplacePath(): string {
  const calls = mockReplace.mock.calls;
  return String(calls[calls.length - 1]?.[0] ?? '');
}

jest.mock('@/lib/i18n', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- jest.requireActual module shape
  const actual = jest.requireActual<typeof import('@/lib/i18n')>('@/lib/i18n');
  return {
    ...actual,
    loadTranslationsDynamic: jest.fn(actual.loadTranslationsDynamic),
  };
});

const quietAuthRequest = {
  headers: { 'X-Skip-Auth-Redirect': 'true', 'X-Skip-Error-Handling': 'true' },
} as const;

const minimalTranslations = {
  register: { termsRequired: 'terms' },
  errors: {
    googleSignInFailed: 'fail',
    userAlreadyExists: 'User already exists',
  },
  common: { loading: 'Loading', filter: 'Filter' },
  login: { filterSavedSuccess: 'Filter saved', filterSaveError: 'Filter save error' },
} as unknown as Translations;

function HarnessRegisterBusiness() {
  const { containerRef, isGoogleAuthInFlight, isGoogleBusy } = useGoogleAuth({
    tab: 'register',
    preferredNewUserType: 'Business',
  });
  return (
    <>
      <div ref={containerRef} data-testid="gis-root" />
      <span data-testid="google-auth-in-flight">{isGoogleAuthInFlight ? 'true' : 'false'}</span>
      <span data-testid="google-auth-busy">{isGoogleBusy ? 'true' : 'false'}</span>
    </>
  );
}

function HarnessWithTab({
  tab,
  preferredNewUserType,
}: {
  tab: 'login' | 'register';
  preferredNewUserType?: 'Business' | 'Individual';
}) {
  const { containerRef } = useGoogleAuth({ tab, preferredNewUserType });
  return <div ref={containerRef} data-testid="gis-root" />;
}

function Harness() {
  const {
    containerRef,
    isButtonReady,
    isButtonRenderTimedOut,
    isGoogleAuthInFlight,
    isGoogleBusy,
    markGoogleSignInIntent,
  } = useGoogleAuth({ tab: 'login' });
  return (
    <>
      <div ref={containerRef} data-testid="gis-root" />
      <button type="button" data-testid="mark-google-intent" onClick={markGoogleSignInIntent}>
        intent
      </button>
      <span data-testid="button-ready">{isButtonReady ? 'true' : 'false'}</span>
      <span data-testid="button-render-timed-out">{isButtonRenderTimedOut ? 'true' : 'false'}</span>
      <span data-testid="google-auth-in-flight">{isGoogleAuthInFlight ? 'true' : 'false'}</span>
      <span data-testid="google-auth-busy">{isGoogleBusy ? 'true' : 'false'}</span>
    </>
  );
}

function HarnessGisLoaded({ loaded }: { loaded: boolean }) {
  const { containerRef, isButtonReady, isButtonRenderTimedOut } = useGoogleAuth({
    tab: 'login',
    gisScriptLoaded: loaded,
  });
  return (
    <>
      <div ref={containerRef} data-testid="gis-root" />
      <span data-testid="button-ready">{isButtonReady ? 'true' : 'false'}</span>
      <span data-testid="button-render-timed-out">{isButtonRenderTimedOut ? 'true' : 'false'}</span>
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
    resetGisInitStateForTests();
    mockSearchParams = new URLSearchParams();
    mockLocalStorageGetItem.mockReset();
    mockLocalStorageGetItem.mockReturnValue(null);
    mockLocalStorageRemoveItem.mockReset();
    mockLocationReplace.mockReset();
    jest.clearAllMocks();
    mockAnalyticsLogin.mockReset();
    mockAnalyticsSignUp.mockReset();
    (authApi.googleSignIn as unknown as GoogleSignInFnMock).mockImplementation(async () => ({
      data: {
        isNewUser: false,
        requiresPhoneVerification: false,
        user: { id: '1' },
      },
    }));
    authStoreState.user = { id: '1', phoneVerified: true };
    authStoreState.setAuth.mockImplementation((...args: unknown[]) => {
      authStoreState.user = args[0] as AuthUserSlice;
    });
    mockReplace.mockClear();
    (authApi.me as unknown as AuthMeFnMock).mockResolvedValue({
      data: { id: '1', phoneVerified: true },
    });
    mockPathname.mockReturnValue('/ru/sign');
    delete (window as unknown as { location?: unknown }).location;
    (window as unknown as { location: Location }).location = {
      pathname: '/ru/sign',
      replace: mockLocationReplace,
    } as Location;
    (loadTranslationsDynamic as jest.Mock).mockImplementation((locale: unknown) =>
      Promise.resolve({ ...minimalTranslations, __locale: String(locale) } as Translations),
    );
    const initialize = jest.fn();
    const renderButton = jest.fn(
      (
        parent: HTMLElement,
        options?: {
          click_listener?: () => void;
          type?: string;
          text?: string;
          width?: number;
        },
      ) => {
        parent.appendChild(document.createElement('iframe'));
        (renderButton as jest.Mock & { lastOptions?: typeof options }).lastOptions = options;
      },
    );
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

  it('returns isButtonReady true after GIS renders button markup', async () => {
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

  it('keeps isButtonReady false until GIS renders markup', async () => {
    let renderedParent: HTMLElement | null = null;
    (window.google!.accounts!.id.renderButton as jest.Mock).mockImplementationOnce(
      (parent: HTMLElement) => {
        renderedParent = parent;
      },
    );

    render(
      <Tree>
        <HarnessGisLoaded loaded={true} />
      </Tree>,
    );

    await waitFor(() => {
      expect(window.google?.accounts?.id.renderButton).toHaveBeenCalled();
    });
    expect(screen.getByTestId('button-ready')).toHaveTextContent('false');

    act(() => {
      renderedParent?.appendChild(document.createElement('iframe'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('button-ready')).toHaveTextContent('true');
    });
  });

  it('does not set popup pending when intent is marked before GIS markup is ready', async () => {
    (window.google!.accounts!.id.renderButton as jest.Mock).mockImplementationOnce(() => {});
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
      expect(window.google?.accounts?.id.renderButton).toHaveBeenCalled();
    });
    expect(screen.getByTestId('button-ready')).toHaveTextContent('false');

    fireEvent.click(screen.getByTestId('mark-google-intent'));
    await act(async () => {
      window.dispatchEvent(new Event('blur'));
    });

    expect(screen.getByTestId('google-auth-busy')).toHaveTextContent('false');
  });

  it('re-initializes GIS when window.google.accounts.id is replaced after first load', async () => {
    mockPathname.mockReturnValue('/ru/sign');
    window.location.pathname = '/ru/sign';

    const { rerender } = render(
      <Tree>
        <HarnessGisLoaded loaded={true} />
      </Tree>,
    );

    await waitFor(() => {
      expect(window.google?.accounts?.id.initialize).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('button-ready')).toHaveTextContent('true');
    });

    const newInitialize = jest.fn();
    const newRenderButton = jest.fn((parent: HTMLElement) => {
      parent.appendChild(document.createElement('iframe'));
    });

    window.google = {
      accounts: {
        id: {
          initialize: newInitialize,
          renderButton: newRenderButton,
        },
      },
    };

    rerender(
      <Tree>
        <HarnessGisLoaded loaded={false} />
      </Tree>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('button-ready')).toHaveTextContent('false');
    });

    rerender(
      <Tree>
        <HarnessGisLoaded loaded={true} />
      </Tree>,
    );

    await waitFor(() => {
      expect(newInitialize).toHaveBeenCalledTimes(1);
      expect(newRenderButton).toHaveBeenCalled();
      expect(screen.getByTestId('button-ready')).toHaveTextContent('true');
    });

    expect(newInitialize.mock.invocationCallOrder[0]).toBeLessThan(
      newRenderButton.mock.invocationCallOrder[0],
    );
  });

  it('redirects new Google users to phone_required with register markers', async () => {
    (authApi.googleSignIn as unknown as GoogleSignInFnMock).mockResolvedValueOnce({
      data: {
        isNewUser: true,
        requiresPhoneVerification: true,
        user: { id: '1' },
      },
    });
    (authApi.me as unknown as AuthMeFnMock).mockResolvedValue({
      data: { id: '1', phoneVerified: false, type: 'Business' },
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
      const path = lastReplacePath();
      expect(
        path.includes('mode=phone_required') &&
          path.includes('source=google_register') &&
          path.includes('selectedType=Business'),
      ).toBe(true);
    });

    expect(mockAnalyticsSignUp).toHaveBeenCalledWith('google');
    expect(mockAnalyticsLogin).not.toHaveBeenCalled();
  });

  it('tracks analytics.login for returning Google users', async () => {
    (authApi.googleSignIn as unknown as GoogleSignInFnMock).mockResolvedValueOnce({
      data: {
        isNewUser: false,
        requiresPhoneVerification: false,
        user: { id: '1' },
      },
    });
    (authApi.me as unknown as AuthMeFnMock).mockResolvedValue({
      data: { id: '1', phoneVerified: true },
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
      expect(mockAnalyticsLogin).toHaveBeenCalledWith('google');
    });
    expect(mockAnalyticsSignUp).not.toHaveBeenCalled();
  });

  it('does not add google_register markers when backend returns existing user', async () => {
    (authApi.googleSignIn as unknown as GoogleSignInFnMock).mockResolvedValueOnce({
      data: {
        isNewUser: false,
        requiresPhoneVerification: true,
        user: { id: '1' },
      },
    });
    (authApi.me as unknown as AuthMeFnMock).mockResolvedValue({
      data: { id: '1', phoneVerified: false, type: 'Business' },
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
      const path = lastReplacePath();
      expect(path.includes('mode=phone_required')).toBe(true);
      expect(path.includes('source=google_register')).toBe(false);
      expect(path.includes('selectedType')).toBe(false);
    });
  });

  it('uses latest tab and preferred type in the one-time GIS callback', async () => {
    (authApi.googleSignIn as unknown as GoogleSignInFnMock).mockResolvedValueOnce({
      data: {
        isNewUser: true,
        requiresPhoneVerification: true,
        user: { id: '1' },
      },
    });
    (authApi.me as unknown as AuthMeFnMock).mockResolvedValue({
      data: { id: '1', phoneVerified: false, type: 'Business' },
    });

    const { rerender } = render(
      <Tree>
        <HarnessWithTab tab="login" />
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
        <HarnessWithTab tab="register" preferredNewUserType="Business" />
      </Tree>,
    );

    await act(async () => {
      await init.callback({ credential: 'tok' });
    });

    expect(authApi.googleSignIn).toHaveBeenCalledWith(
      {
        idToken: 'tok',
        termsAccepted: true,
        type: 'Business',
      },
      quietAuthRequest,
    );
    await waitFor(() => {
      const path = lastReplacePath();
      expect(
        path.includes('mode=phone_required') &&
          path.includes('source=google_register') &&
          path.includes('selectedType=Business'),
      ).toBe(true);
    });
  });

  it('redirects new login-tab Google users to phone_required without selectedType', async () => {
    (authApi.googleSignIn as unknown as GoogleSignInFnMock).mockResolvedValueOnce({
      data: {
        isNewUser: true,
        requiresPhoneVerification: true,
        user: { id: '1' },
      },
    });
    (authApi.me as unknown as AuthMeFnMock).mockResolvedValue({
      data: { id: '1', phoneVerified: false, type: 'Individual' },
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

    expect(authApi.googleSignIn).toHaveBeenCalledWith(
      {
        idToken: 'tok',
        termsAccepted: true,
      },
      quietAuthRequest,
    );
    await waitFor(() => {
      const path = lastReplacePath();
      expect(path.includes('mode=phone_required')).toBe(true);
      expect(path.includes('source=google_register')).toBe(true);
      expect(path.includes('selectedType=Individual')).toBe(true);
    });
  });

  it('sets isGoogleBusy true before googleSignIn resolves', async () => {
    let resolveGoogleSignIn: (value: { data: GoogleSignInResponseSlice }) => void = () => {};
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

    await act(async () => {
      resolveGoogleSignIn({
        data: {
          isNewUser: false,
          requiresPhoneVerification: false,
          user: { id: '1' },
        },
      });
    });

    await waitFor(() => {
      expect(lastReplacePath()).toBe('/ru');
    });
    expect(authStoreState.setAuth).toHaveBeenCalledWith({
      id: '1',
      phoneVerified: true,
    });
  });

  it('passes icon button configuration to GIS renderButton', async () => {
    render(
      <Tree>
        <Harness />
      </Tree>,
    );

    await waitFor(() => {
      expect(window.google?.accounts?.id.renderButton).toHaveBeenCalled();
    });

    const renderButton = window.google!.accounts!.id.renderButton as jest.Mock & {
      lastOptions?: {
        click_listener?: () => void;
        type?: string;
      };
    };
    expect(renderButton.lastOptions?.click_listener).toEqual(expect.any(Function));
    expect(renderButton.lastOptions).toMatchObject({
      type: 'icon',
      theme: 'outline',
      size: 'large',
    });
  });

  it('sets isGooglePopupPending on GIS click_listener followed by blur', async () => {
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
      expect(screen.getByTestId('button-ready')).toHaveTextContent('true');
    });

    const renderButton = window.google!.accounts!.id.renderButton as jest.Mock & {
      lastOptions?: { click_listener?: () => void };
    };

    act(() => {
      renderButton.lastOptions?.click_listener?.();
    });

    await act(async () => {
      window.dispatchEvent(new Event('blur'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('google-auth-busy')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('google-auth-in-flight')).toHaveTextContent('false');
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
    await waitFor(() => {
      expect(screen.getByTestId('button-ready')).toHaveTextContent('true');
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

  it('clears popup pending on window focus after Google cancel', async () => {
    jest.useFakeTimers();
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
      expect(screen.getByTestId('button-ready')).toHaveTextContent('true');
    });

    fireEvent.click(screen.getByTestId('mark-google-intent'));
    await act(async () => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(screen.getByTestId('google-auth-busy')).toHaveTextContent('true');

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      jest.advanceTimersByTime(400);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('google-auth-busy')).toHaveTextContent('false');
    });
    jest.useRealTimers();
  });

  it('clears popup pending on visibilitychange when tab becomes visible', async () => {
    jest.useFakeTimers();
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
      expect(screen.getByTestId('button-ready')).toHaveTextContent('true');
    });

    fireEvent.click(screen.getByTestId('mark-google-intent'));
    await act(async () => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(screen.getByTestId('google-auth-busy')).toHaveTextContent('true');

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      jest.advanceTimersByTime(400);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('google-auth-busy')).toHaveTextContent('false');
    });
    jest.useRealTimers();
  });

  it('clears popup pending on pageshow after returning to the page', async () => {
    jest.useFakeTimers();
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
      expect(screen.getByTestId('button-ready')).toHaveTextContent('true');
    });

    fireEvent.click(screen.getByTestId('mark-google-intent'));
    await act(async () => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(screen.getByTestId('google-auth-busy')).toHaveTextContent('true');

    await act(async () => {
      window.dispatchEvent(new Event('pageshow'));
      jest.advanceTimersByTime(400);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('google-auth-busy')).toHaveTextContent('false');
    });
    jest.useRealTimers();
  });

  it('clears stuck popup pending via safety timeout without focus', async () => {
    jest.useFakeTimers();
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
      expect(screen.getByTestId('button-ready')).toHaveTextContent('true');
    });

    fireEvent.click(screen.getByTestId('mark-google-intent'));
    await act(async () => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(screen.getByTestId('google-auth-busy')).toHaveTextContent('true');

    await act(async () => {
      jest.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('google-auth-busy')).toHaveTextContent('false');
    });
    jest.useRealTimers();
  });

  it('marks button render timed out when GIS never inserts markup', async () => {
    jest.useFakeTimers();
    (window.google!.accounts!.id.renderButton as jest.Mock).mockImplementation(() => {});

    render(
      <Tree>
        <HarnessGisLoaded loaded={true} />
      </Tree>,
    );

    await waitFor(() => {
      expect(window.google?.accounts?.id.renderButton).toHaveBeenCalled();
    });
    expect(screen.getByTestId('button-ready')).toHaveTextContent('false');
    expect(screen.getByTestId('button-render-timed-out')).toHaveTextContent('false');

    await act(async () => {
      jest.advanceTimersByTime(8_000);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('button-render-timed-out')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('button-ready')).toHaveTextContent('false');
    expect(window.google?.accounts?.id.renderButton).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
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

  it('saves pendingSavedFilter after Google login when phone is verified', async () => {
    const pendingFilters = { brand_ids: ['brand-1'], vehicleType: 'car' };
    mockSearchParams = new URLSearchParams('returnUrl=%2Ffavorites%3Ftab%3Dfilters');
    mockLocalStorageGetItem.mockImplementation((key: string) => {
      if (key === 'pendingSavedFilter') {
        return JSON.stringify(pendingFilters);
      }
      return null;
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
      expect(savedFiltersApi.create).toHaveBeenCalledWith(
        expect.stringMatching(/^Filter \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/),
        pendingFilters,
      );
    });
    expect(mockLocalStorageRemoveItem).toHaveBeenCalledWith('pendingSavedFilter');
    expect(toast.success).toHaveBeenCalledWith('Filter saved');
    expect(mockReplace).toHaveBeenCalledWith('/favorites?tab=filters');
    expect(mockLocationReplace).not.toHaveBeenCalled();
  });

  it('redirects new Google users without phone verification to complete-profile', async () => {
    (authApi.googleSignIn as unknown as GoogleSignInFnMock).mockResolvedValueOnce({
      data: {
        isNewUser: true,
        requiresPhoneVerification: false,
        user: { id: '1' },
      },
    });
    (authApi.me as unknown as AuthMeFnMock).mockResolvedValue({
      data: { id: '1', phoneVerified: true, type: 'Individual' },
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
      expect(lastReplacePath()).toBe('/ru/complete-profile');
    });
  });

  it('replaces route to localized home when existing user signs in and returnUrl is absent', async () => {
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
      expect(lastReplacePath()).toBe('/ru');
    });
    expect(authStoreState.setAuth).toHaveBeenCalledWith({
      id: '1',
      phoneVerified: true,
    });
  });

  it('shows translated backend error once when googleSignIn returns an API error key', async () => {
    (authApi.googleSignIn as unknown as GoogleSignInFnMock).mockRejectedValueOnce({
      response: { data: { message: 'errors.userAlreadyExists' } },
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
      expect(toast.error).toHaveBeenCalledTimes(1);
    });
    expect(toast.error).toHaveBeenCalledWith('User already exists');
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
