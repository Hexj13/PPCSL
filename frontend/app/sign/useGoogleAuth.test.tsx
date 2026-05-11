/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, waitFor } from '@testing-library/react';

const mockPathname = jest.fn(() => '/ru/sign');

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
    googleSignIn: jest.fn().mockResolvedValue(undefined),
    me: jest.fn().mockResolvedValue({ data: { id: '1', phoneVerified: true } }),
  },
}));

const authStoreState = {
  user: { id: '1', phoneVerified: true } as { id: string; phoneVerified: boolean },
  setAuth: jest.fn(),
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

import { I18nProvider } from '@/components/providers/I18nProvider';
import { loadTranslationsDynamic, type Translations } from '@/lib/i18n';

import { useGoogleAuth } from './useGoogleAuth';

const minimalTranslations = {
  register: { termsRequired: 'terms' },
  errors: { googleSignInFailed: 'fail' },
} as unknown as Translations;

function Harness() {
  const { containerRef } = useGoogleAuth({ mode: 'login' });
  return <div ref={containerRef} data-testid="gis-root" />;
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
});
