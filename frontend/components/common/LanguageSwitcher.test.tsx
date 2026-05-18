/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';

const pushMock = jest.fn();
const refreshMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
  usePathname: () => '/ru/dacia',
}));

jest.mock('@/components/common/Dropdown', () => ({
  Dropdown: ({
    onChange,
    options,
  }: {
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <div>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          data-testid={`lang-${o.value}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    updateProfile: jest.fn(() => Promise.resolve({})),
  },
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: () => null,
}));

jest.mock('@/lib/locale-routing', () => ({
  resolveLocaleRouting: jest.fn(() => ({
    defaultLocale: 'ro',
    supportedLocales: ['ro', 'ru'],
    prefixedLocales: ['ru'],
    enableLegacyDefaultLocaleRedirect: true,
    languageSwitcherTranslationKeys: {
      ro: 'common.languageRo',
      ru: 'common.languageRu',
    },
  })),
  shouldShowLanguageSwitcher: jest.fn(() => true),
  isLanguageSwitcherEnabledEnv: jest.fn(() => true),
}));

import { I18nProvider } from '@/components/providers/I18nProvider';
import type { Translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n-types';

import { LanguageSwitcher } from './LanguageSwitcher';

function Tree({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  return (
    <I18nProvider initialLocale={initialLocale} initialTranslations={{} as Translations}>
      {children}
    </I18nProvider>
  );
}

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (window as unknown as { location?: unknown }).location;
    (window as unknown as { location: Location }).location = {
      pathname: '/ru/dacia',
      search: '',
    } as Location;
  });

  it('calls router.push and router.refresh when switching away from current locale', async () => {
    render(
      <Tree initialLocale="ru">
        <LanguageSwitcher />
      </Tree>,
    );

    fireEvent.click(screen.getByTestId('lang-ro'));

    expect(pushMock).toHaveBeenCalledWith('/dacia');
    expect(refreshMock).toHaveBeenCalled();
  });
});
