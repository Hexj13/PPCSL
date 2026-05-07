/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const usePathnameMock = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

jest.mock('@/lib/i18n', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- jest.requireActual module shape
  const actual = jest.requireActual<typeof import('@/lib/i18n')>('@/lib/i18n');
  return {
    ...actual,
    loadTranslationsDynamic: jest.fn(actual.loadTranslationsDynamic),
  };
});

import { loadTranslationsDynamic, type Translations } from '@/lib/i18n';

import { I18nProvider, useI18n } from './I18nProvider';

function Readout() {
  const { locale, isLoading } = useI18n();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="loading">{isLoading ? 'yes' : 'no'}</span>
    </div>
  );
}

function Tree({ children }: { children: ReactNode }) {
  return (
    <I18nProvider initialLocale="ro" initialTranslations={{} as Translations}>
      {children}
    </I18nProvider>
  );
}

describe('I18nProvider', () => {
  const originalSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
    jest.clearAllMocks();
    (loadTranslationsDynamic as jest.Mock).mockImplementation((locale: string) =>
      Promise.resolve({ __testLocale: locale } as unknown as Translations),
    );
    delete (window as unknown as { location?: unknown }).location;
    (window as unknown as { location: Location }).location = {
      pathname: '/',
    } as Location;
    usePathnameMock.mockReturnValue('/');
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = originalSwitcher;
  });

  it('updates locale when pathname gains /ru without full reload', async () => {
    const { rerender } = render(
      <Tree>
        <Readout />
      </Tree>,
    );

    expect(screen.getByTestId('locale').textContent).toBe('ro');

    usePathnameMock.mockReturnValue('/ru/listings');
    window.location.pathname = '/ru/listings';
    rerender(
      <Tree>
        <Readout />
      </Tree>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe('ru');
    });
    expect(screen.getByTestId('loading').textContent).toBe('no');
    expect(loadTranslationsDynamic).toHaveBeenCalledWith('ru');
  });

  it('ignores stale translation load after rapid pathname changes', async () => {
    let finishRu: (v: unknown) => void = () => {};
    const ruPromise = new Promise((resolve) => {
      finishRu = resolve;
    });

    (loadTranslationsDynamic as jest.Mock).mockImplementation((locale: string) => {
      if (locale === 'ru') {
        return ruPromise as Promise<Translations>;
      }
      return Promise.resolve({ __testLocale: locale } as unknown as Translations);
    });

    const { rerender } = render(
      <Tree>
        <Readout />
      </Tree>,
    );

    usePathnameMock.mockReturnValue('/ru/foo');
    window.location.pathname = '/ru/foo';
    rerender(
      <Tree>
        <Readout />
      </Tree>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('yes');
    });

    usePathnameMock.mockReturnValue('/about');
    window.location.pathname = '/about';
    rerender(
      <Tree>
        <Readout />
      </Tree>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe('ro');
    });

    await act(async () => {
      finishRu({ __stale: true } as unknown as Translations);
      await Promise.resolve();
    });

    expect(screen.getByTestId('locale').textContent).toBe('ro');
    expect(screen.getByTestId('loading').textContent).toBe('no');
  });
});
