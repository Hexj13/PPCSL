/**
 * @jest-environment jsdom
 */

import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

jest.mock('next/navigation', () => ({
  usePathname: () => '/ru',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

import { I18nProvider } from '@/components/providers/I18nProvider';
import type { Translations } from '@/lib/i18n';

import { GuestDesktopNavLinks } from './GuestDesktopNav';

function Tree({ children }: { children: ReactNode }) {
  return (
    <I18nProvider initialLocale="ru" initialTranslations={{} as Translations}>
      {children}
    </I18nProvider>
  );
}

describe('GuestDesktopNavLinks', () => {
  it('uses locale-prefixed hrefs for public guest links', () => {
    render(
      <Tree>
        <GuestDesktopNavLinks comparisonCount={0} navLinkClasses="x" t={(k) => k} />
      </Tree>,
    );

    expect(screen.getByRole('link', { name: 'header.listings' })).toHaveAttribute('href', '/ru');
    expect(screen.getByRole('link', { name: 'header.compare' })).toHaveAttribute(
      'href',
      '/ru/compare',
    );
    expect(screen.getByRole('link', { name: 'header.forBusiness' })).toHaveAttribute(
      'href',
      '/ru/partners',
    );
  });
});
